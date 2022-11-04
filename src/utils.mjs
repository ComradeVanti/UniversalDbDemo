import {classTableName, propertyTableName} from "./constants.mjs";

const predefinedTypeNames = [
    "Null", "Undefined", "Number",
    "String", "Boolean", "Object"
]

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
 * @param {PropertyDefinition} propertyDef
 * @param {string} className
 * @param {lf.Database} db
 * @return {Promise<boolean>}
 */
export async function propertyExistsInClass(propertyDef, className, db) {
    let classId = await tryGetClassIdByName(className, db);
    // If the class does not exist, it does not contain the property
    if (classId === null) return false;
    let propertyTable = getPropertyTable(db)
    let rows = await db.select()
        .from(propertyTable)
        .where(propertyTable.classId.eq(classId) &&
                   propertyTable.name.eq(propertyDef.name) &&
                   propertyTable.type.eq(propertyDef.typeName))
        .exec()
    // There should only ever be one of a property in a class
    return rows.length === 1
}

/**
 * @param {*} thing
 * @param {lf.Database} db
 * @return {Promise<TypeLabel|null>}
 */
export async function tryGetTypeLabelFor(thing, db) {
    let typeName = getThingTypeName(thing)
    if (predefinedTypeNames.includes(typeName))
        return typeName
    else {
        let classId = await tryGetClassIdByName(typeName, db)
        // If the referenced class does not exist
        if (classId === null) return null;
        return "Ref " + classId;
    }
}

/**
 * @param {number} classId
 * @param {number} objectId
 * @param {lf.Database} db
 * @return {*|null}
 */
function tryGetObject(classId, objectId, db){
    throw  "Not implemented"
}

/**
 * @param {string} value
 * @param {TypeLabel} typeLabel
 * @param {lf.Database} db
 * @return {Promise<*|null>}
 */
export async function tryParseAs(value, typeLabel, db) {
    // Reference-properties start with "Ref"
    if (typeLabel.startsWith("Ref")) {
        // The class-id is the number after the "Ref "
        let classId = parseInt( typeLabel.substring(typeLabel.indexOf(" ") + 1))
        let objectId = parseInt(value)
        return await tryGetObject(classId, objectId, db)
    } else
        return JSON.parse(value)
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
