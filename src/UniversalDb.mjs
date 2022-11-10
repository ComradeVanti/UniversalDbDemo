import {
    getProperties, getSuperClassName,
    makeInstanceOf, getThingTypeName,
    ownPropertiesOf, trimToSuperType,
    UnknownType
} from "./typeUtils.mjs";
import SQLDb, {
    DuplicateClassNameError,
    ItemNotFoundError,
    MysteryError,
    SQLError
} from "./SQLDb.js";

const ParsableTypes = ["String", "Number", "Boolean", "Object"]

export default class UniversalDb {

    /**
     * @type{SQLDb}
     */
    #sql


    /**
     * @param {SQLDb} sql
     */
    constructor(sql) {
        this.#sql = sql
    }


    /**
     * @return {Promise<UniversalDb>}
     */
    static async makeEmpty() {
        let sql = await SQLDb.makeEmpty()
        return new UniversalDb(sql);
    }


    /**
     * @param {Id} classId
     * @return {Promise<PropertyDefinition[]>}
     */
    async getPropertyDefinitionsByClassId(classId) {
        let entries = await this.#sql.tryGetPropertiesByClassId(classId)
        return entries.map(row => ({name: row.name, typeName: row.type}))
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<PropertyDefinition|null>}
     */
    async tryGetClassProperty(propertyName, className) {
        let entry = await this.#sql.tryGetClassByName(className);
        // If the class does not exist, we can't get the property
        if (entry instanceof SQLError) {
            return null;
        }
        let properties = await this.getPropertyDefinitionsByClassId(entry.id)
        return properties.find(it => it.name === propertyName) ?? null
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<boolean>}
     */
    async propertyExistsInClass(propertyName, className) {
        let property = await this.tryGetClassProperty(propertyName, className)
        return property !== null
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<boolean>}
     */
    async propertyIsUnknownInClass(propertyName, className) {
        let property = await this.tryGetClassProperty(propertyName, className)
        return property !== null && property.typeName === UnknownType
    }

    /**
     * @param {Id} classId
     * @param {Id} objectId
     * @return {*|null}
     */
    tryGetObject(classId, objectId) {
        throw  "Not implemented"
    }

    /**
     * @param {string} name
     * @return {Promise<boolean>}
     */
    async classWithNameExists(name) {
        let entry = await this.#sql.tryGetClassByName(name);
        return !(entry instanceof SQLError);
    }

    /**
     * @param {TypedObject} thing
     * @return {Promise}
     */
    async #insertClassFor(thing) {
        let superClassName = getSuperClassName(thing);

        let superClassID = null;
        if (superClassName !== null) {
            superClassID = await this.#sql.tryGetClassByName(superClassName);

            if (superClassID instanceof SQLError) {
                // add superclass
                let trimmedSuperClass = trimToSuperType(thing);
                superClassID = await this.#insertClassFor(trimmedSuperClass);
            }
        }

        let result = await this.#sql.tryInsertClass(getThingTypeName(thing), superClassID);
        if (result instanceof SQLError) {
            switch (result) {
                case MysteryError :
                    throw(`MysteryError: ${result} in method #insertClassFor`);
                    break;
                case DuplicateClassNameError :
                    throw(`DuplicateClassNameError: ${result} in method #insertClassFor`);
                    break;
                case ItemNotFoundError :
                    throw(`ItemNotFoundError: ${result} in method #insertClassFor`);
                    break;
                    break;
            }
        } else {
            console.log(`Class with id ${result} created (${getThingTypeName(thing)})`);
        }

        await this.#insertProperties(thing);
        return result;
    }

    /**
     * @param {TypedObject} thing
     * @return {Promise}
     */
    async #insertProperties(thing) {
        let propertyProps = ownPropertiesOf(thing);

        for (let elem of propertyProps) {
            let className = getThingTypeName(thing);
            let classEntry = await this.#sql.tryGetClassByName(className);
            let classId = classEntry.id;

            if (elem.definition.typeName === "Unknown") {
                // property name is unknown
                if (await this.propertyExistsInClass(elem.definition.name, className) === false) {
                    // only store property, with type is undefined, if it doesn't exist already
                    let result =
                        await this.#sql.tryInsertProperty(elem.definition.name, classId, elem.definition.typeName);
                    if (result instanceof SQLError) {
                        switch (result) {
                            case MysteryError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                            case DuplicateClassNameError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                            case ItemNotFoundError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                        }
                    } else {
                        console.log(`Property with id ${result} created (${elem.definition.name})`);
                    }
                }
            } else {
                // property name is known
                if (await this.propertyIsUnknownInClass(elem.definition.name, className)) {
                    // modifies property if property type is unknown yet
                    let propertyEntry = await this.#sql.tryGetPropertyByName(classId, elem.definition.name);
                    await this.#sql.tryUpdateProperty(
                        propertyEntry.id, elem.definition.name, classId, elem.definition.typeName
                    );
                } else if (await this.propertyExistsInClass(elem.definition.name, className)) {
                    // skip if property exist already

                } else {
                    // store property (property type is known and doesn't exist yet)
                    let result =
                        await this.#sql.tryInsertProperty(elem.definition.name, classId, elem.definition.typeName);
                    if (result instanceof SQLError) {
                        switch (result) {
                            case MysteryError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                            case DuplicateClassNameError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                            case ItemNotFoundError :
                                throw(`Error: ${result} in method #insertProperties`);
                                break;
                        }
                    } else {
                        console.log(`Property with id ${result} created (${elem.definition.name})`);
                    }
                }
            }
        }
    }

    /**
     * @param {TypedObject} thing
     * @return {Promise}
     */
    async #insertObject(thing) {
        let className = getThingTypeName(thing);
        let classEntry = await this.#sql.tryGetClassByName(className);

        let result = await this.#sql.tryInsertObject(classEntry.id);
        if (result instanceof SQLError) {
            switch (result) {
                case MysteryError :
                    throw(`Error: ${result} in method #insertObjetFor`);
                    break;
                case DuplicateClassNameError :
                    throw(`Error: ${result} in method #insertObjetFor`);
                    break;
                case ItemNotFoundError :
                    throw(`Error: ${result} in method #insertObjetFor`);
                    break;
            }
        } else {
            console.log(`Object with id ${result} created`);
            return result;
        }
    }

    /**
     * @param {Id} objectId
     * @param {TypedObject} thing
     * @return {Promise}
     */
    async #insertValue(objectId, thing) {
        let propertyProps = getProperties(thing);
        let className = getThingTypeName(thing);
        let classEntry = await this.#sql.tryGetClassByName(className);

        let trimmedSuperClass;
        if (classEntry.superId !== null) {
            trimmedSuperClass = trimToSuperType(thing);
        }

        for (let elem of propertyProps) {
            let propertyEntry;
            if (classEntry.superId !== null && trimmedSuperClass.hasOwnProperty(elem.definition.name)) {
                propertyEntry = await this.#sql.tryGetPropertyByName(classEntry.superId, elem.definition.name);
            } else {
                propertyEntry = await this.#sql.tryGetPropertyByName(classEntry.id, elem.definition.name);
            }

            let result;
            if (typeof elem.value === 'object' && elem.value !== null) {
                let createdObjectId = await this.handleStoreValueIfValueIsObject(elem.value);
                result = await this.#sql.tryInsertValue(propertyEntry.id, objectId, JSON.stringify(createdObjectId));
            }
            if (elem.value === null) {
                result = await this.#sql.tryInsertValue(propertyEntry.id, objectId, "null");
            } else {
                result = await this.#sql.tryInsertValue(propertyEntry.id, objectId, JSON.stringify(elem.value));
            }

            if (result instanceof SQLError) {
                switch (result) {
                    case MysteryError :
                        throw(`Error: ${result} in method #insertValue`);
                        break;
                    case DuplicateClassNameError :
                        throw(`Error: ${result} in method #insertValue`);
                        break;
                    case ItemNotFoundError :
                        throw(`Error: ${result} in method #insertValue`);
                        break;
                }
            } else {
                console.log(`Value with id ${result} created (${JSON.stringify(elem.value)})`);
            }
        }
    }

    /**
     * @param {TypedObject} thing
     * @return {Promise}
     */
    async handleStoreValueIfValueIsObject(thing) {
        if (!(await this.classWithNameExists(getThingTypeName(thing)))) {
            await this.#insertClassFor(thing);
        }
        let objectId = await this.#insertObject(thing);
        await this.#insertValue(objectId, thing);

        return objectId;
    }

    /**
     * @param {TypedObject} thing
     * @return {Promise<Id>}
     */
    async store(thing) {
        if (!(await this.classWithNameExists(getThingTypeName(thing)))) {
            await this.#insertClassFor(thing);
        }
        let objectId = await this.#insertObject(thing);
        await this.#insertValue(objectId, thing);
        return objectId
    }

    /**
     * @param {Id} id
     * @return {Promise<ObjectEntry|null>}
     */
    async #tryGetObjectById(id) {
        let result = await this.#sql.tryGetObjectById(id)
        return result instanceof SQLError ? null : result;
    }

    /**
     * @param {Id} id
     * @return {Promise<ClassDefinition|null>}
     */
    async #tryGetClassDefinitionFor(id) {
        let classEntry = await this.#sql.tryGetClassById(id)
        if (classEntry instanceof SQLError) return null
        let properties = await this.#sql.tryGetPropertiesByClassId(id)
        return {name: classEntry.name, properties}
    }

    /**
     * @param {Id} propId
     * @param {Id} objectId
     * @return {Promise<string>}
     */
    async #loadValue(propId, objectId) {
        let result = await this.#sql.tryGetValueForProperty(propId, objectId)
        if (result instanceof SQLError) throw "Oh no, value not found"
        return result.value
    }

    /**
     * @param {string} typeName
     * @return {boolean}
     */
    #isParsable(typeName) {
        return ParsableTypes.includes(typeName)
    }

    /**
     * @param {string} unparsed
     * @param  {string} typeName
     * @param {Type[]} allTypes
     * @return {Promise<*>}
     */
    async #parse(unparsed, typeName, allTypes) {
        return typeName === UnknownType ? null
            : unparsed === "null" ? null
                : this.#isParsable(typeName) ? JSON.parse(unparsed)
                    : await this.tryLoad(parseInt(unparsed), allTypes)
    }

    /**
     * @param {Id} id
     * @param {Type[]} allTypes
     * @return {Promise<TypedObject|null>}
     */
    async tryLoad(id, allTypes) {

        /**
         * @param {string} name
         * @return {Type|null}
         */
        function tryGetTypeOfName(name) {
            return allTypes.find(it => it.name === name) ?? null
        }

        let objectEntry = await this.#tryGetObjectById(id)
        if (objectEntry === null) return null

        let classId = objectEntry.classId
        let definition = await this.#tryGetClassDefinitionFor(classId)
        if (definition === null) return null

        let type = tryGetTypeOfName(definition.name)
        if (type === null) return null

        let obj = makeInstanceOf(type)

        for (let property of definition.properties) {
            let unparsed = await this.#loadValue(property.id, id)
            obj[property.name] = this.#parse(unparsed, property.type, allTypes)
        }

        return obj
    }

    /**
     * @param {string} className
     * @param {string} propertyName
     * @param {string} sorting (ASC | DESC)
     * @return {Type|null}
     */
    async tryLoadAllValuesOfClassByProp(className, PropertyName, sorting) {
        let result = this.#sql.loadAllValuesOfClassByProp(className, PropertyName, sorting);
        if (result instanceof SQLError) {
            return "Something failed"
        } else {
            return result;
        }
    }
}
