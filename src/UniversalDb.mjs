import {
    getProperties,
    getSuperClassName,
    getThingTypeName,
    UnknownType
} from "./typeUtils.mjs";
import SQLDb from "./SQLDb.js";

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
     * @param {Id} classId
     * @return {Promise<ClassDefinition|null>}
     */
    async tryGetClassDefinitionById(classId) {
        let properties = await this.getPropertyDefinitionsByClassId(classId)
        return {name, properties}
    }

    /**
     * @param {string} name
     * @return {Promise<ClassDefinition|null>}
     */
    async tryGetClassDefinitionByName(name) {
        let entry = await this.#sql.tryGetClassByName(name)
        if (entry === null) return null
        return this.tryGetClassDefinitionById(entry.id)
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<PropertyDefinition|null>}
     */
    async tryGetClassProperty(propertyName, className) {
        let entry = await this.#sql.tryGetClassByName(className);
        // If the class does not exist, we can't get the property
        if (entry === null) return null;
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
        let entry = await this.#sql.tryGetClassByName(name)
        return entry !== null
    }

    /**
     * @param {NamedObject} thing
     * @return {Promise}
     */
    async #insertClassFor(thing) {
        let superClassName = getSuperClassName(thing);

        let superClassID = null;
        if (superClassName !== null) {
            superClassID = await this.#sql.tryGetClassByName(superClassName);
        }

        let result = await this.#sql.tryInsertClass(getThingTypeName(thing), superClassID);
        if (result === null) {
            throw("Something failed");
        } else {
            console.log(`Class with id ${result} created`);
        }
    }

    /**
     * @param {NamedObject} thing
     * @return {Promise}
     */
    async #insertProperties(thing) {
        let propertyProps = getProperties(thing);

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
                    if (result === null) {
                        throw("Something failed");
                    } else {
                        console.log(`Property with id ${result} created`);
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
                    continue;
                } else {
                    // store property (property type is known and doesn't exist yet)
                    let result =
                        await this.#sql.tryInsertProperty(elem.definition.name, classId, elem.definition.typeName);
                    if (result === null) {
                        throw("Something failed");
                    } else {
                        console.log(`Property with id ${result} created`);
                    }
                }
            }
        }
    }

    /**
     * @param {NamedObject} thing
     * @return {Promise}
     */
    async store(thing) {
        if (!(await this.classWithNameExists(getThingTypeName(thing)))) {
            await this.#insertClassFor(thing);
        }

        await this.#insertProperties(thing);
    }

}
