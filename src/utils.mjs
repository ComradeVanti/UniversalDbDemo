import {classTableName, propertyTableName} from "./constants.mjs";

/**
 * @param {*} thing
 * @return {string}
 */
export function getThingTypeName(thing) {
    if (thing === null) return "Null"
    if (thing === undefined) return "Undefined"
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
    let propertyTable = db.getSchema().table(propertyTableName)
    let rows = await db.select()
        .from(propertyTable)
        .where(propertyTable.classId.eq(classId) &&
                   propertyTable.name.eq(propertyDef.name) &&
                   propertyTable.type.eq(propertyDef.typeName))
        .exec()
    return rows.length === 1
}

/**
 * @param {string} name
 * @param {lf.Database} db
 * @return {Promise<number | null>}
 */
export async function tryGetClassIdByName(name, db) {
    let classTable = db.getSchema().table(classTableName)
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
