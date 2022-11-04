import { classTableName} from "./constants.mjs";

/**
 * @param {*} thing
 * @return {string}
 */
export function getThingTypeName(thing) {
    return thing.constructor.name
}

/**
 * @param {Object} thing
 * @return {string | null}
 */
export function getSuperClassName(thing) {
    let name = Object.getPrototypeOf(Object.getPrototypeOf(thing)).constructor.name
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
