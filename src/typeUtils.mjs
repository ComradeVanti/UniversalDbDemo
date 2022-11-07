export const UnknownType = "Unknown"

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
