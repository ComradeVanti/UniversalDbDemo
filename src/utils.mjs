import {classTableName, propertyTableName, UnknownType} from "./constants.mjs";


/**
 * @param {*} thing
 * @return {string}
 */
export function getThingTypeName(thing) {
    if (thing === null || thing === undefined) return UnknownType
    return thing.constructor.name
}

/**
 * @param {*} obj
 * @return {boolean}
 */
export function isNamedObject(obj) {
    return getThingTypeName(obj) !== "Object" && obj instanceof Object
}

/**
 * @param {lf.Database} db
 * @return {lf.schema.Table}
 */
function getClassTable(db) {
    return db.getSchema().table(classTableName)
}

/**
 * @param {lf.Database} db
 * @return {lf.schema.Table}
 */
function getPropertyTable(db) {
    return db.getSchema().table(propertyTableName)
}

/**
 * @param {NamedObject} obj
 * @return {ClassDefinition|null}
 */
export function classDefinitionOf(obj) {
    if (!isNamedObject(obj)) return null
    let className = getThingTypeName(obj)
    let propertyDefinitions =
        getProperties(obj)
            .map(prop => prop.definition)
    return {name: className, properties: propertyDefinitions}
}

/**
 * @param {NamedObject} obj
 * @return {string|null}
 */
export function getSuperClassName(obj) {
    if (!isNamedObject(obj)) return null
    let superClass = Object.getPrototypeOf(Object.getPrototypeOf(obj))
    let name = superClass.constructor.name
    // If the object inherits directly from "Object",
    // it has no super-class
    return name === "Object" ? null : name;
}

/**
 * @param {Object} thing
 * @return {Property[]}
 */
export function getProperties(thing) {
    return Object.entries(thing)
        .map(([key, value]) => ({
            definition: {
                name: key,
                typeName: getThingTypeName(value)
            },
            value: value
        }))
}

/**
 * @param {string} propertyName
 * @param {string} className
 * @param {lf.Database} db
 * @return {Promise<PropertyDefinition|null>}
 */
async function tryGetClassProperty(propertyName, className, db) {
    let classId = await tryGetClassIdByName(className, db);
    // If the class does not exist, we can't get the property
    if (classId === null) return null;
    let propertyTable = getPropertyTable(db)
    let row = (await db.select()
        .from(propertyTable)
        .where(propertyTable.classId.eq(classId) &&
                   propertyTable.name.eq(propertyName))
        .exec())[0]
    // The property was not found
    if (row === null || row === undefined) return null
    return {name: row.name, typeName: row.type}
}

/**
 * @param {string} propertyName
 * @param {string} className
 * @param {lf.Database} db
 * @return {Promise<boolean>}
 */
export async function propertyExistsInClass(propertyName, className, db) {
    let property = await tryGetClassProperty(propertyName, className, db)
    return property !== null
}

/**
 * @param {string} propertyName
 * @param {string} className
 * @param {lf.Database} db
 * @return {Promise<boolean>}
 */
export async function propertyIsUnknownInClass(propertyName, className, db) {
    let property = await tryGetClassProperty(propertyName, className, db)
    return property !== null && property.typeName === UnknownType
}

/**
 * @param {number} classId
 * @param {number} objectId
 * @param {lf.Database} db
 * @return {*|null}
 */
function tryGetObject(classId, objectId, db) {
    throw  "Not implemented"
}

/**
 * @param {string} name
 * @param {lf.Database} db
 * @return {Promise<number | null>}
 */
export async function tryGetClassIdByName(name, db) {
    let classTable = getClassTable(db)
    let rows = await db.select(classTable.id)
        .from(classTable)
        .where(classTable.name.eq(name))
        .exec();
    return rows[0]?.id ?? null
}

/**
 * @param {string} name
 * @param {lf.Database} db
 * @return {Promise<boolean>}
 */
export async function classWithNameExists(name, db) {
    let id = await tryGetClassIdByName(name, db)
    return id !== null
}
