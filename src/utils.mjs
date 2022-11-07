import {classTableName, propertyTableName} from "./constants.mjs";


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
 * @param {*} thing
 * @return {string}
 */
export function getThingTypeName(thing) {
    if (thing === null || thing === undefined) return "Unknown"
    return thing.constructor.name
}

/**
 * @param {Object} thing
 * @return {string | null}
 */
export function getSuperClassName(thing) {
    let superClass = Object.getPrototypeOf(Object.getPrototypeOf(thing))
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
    return property !== null && property.typeName === "Unknown"
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
