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
            superClassID = await tryGetClassIdByName(superClassName, db)
        }

        let class_table = this.#getClassTable()
        let class_row = class_table.createRow({
                                                  name: getThingTypeName(thing),
                                                  superId: superClassID,
                                              });

        await this.#sql.insertOrReplace().into(class_table).values([class_row]).exec();
    }

    /**
     * @param {NamedObject} thing
     * @return {Promise}
     */
    async #insertProperties(thing) {
        let propertyProps = getProperties(thing);

        for (let elem of propertyProps) {
            let className = getThingTypeName(thing);
            let classId = await this.tryGetClassIdByName(className);

            if (elem.definition.typeName === "Unknown") {
                // property name is unknown
                if (await this.propertyExistsInClass(elem.definition.name, className) === false) {
                    // only store property, with type is undefined, if it doesn't exist already
                    await this.#storePropertyToDB(elem, classId);
                }
            } else {
                // property name is known
                if (await this.propertyIsUnknownInClass(elem.definition.name, className)) {
                    // modifies property if property type is unknown yet
                    await this.#modifyPropertyInDB(elem, classId);
                } else if (await this.propertyExistsInClass(elem.definition.name, className)) {
                    // skip if property exist already
                    continue;
                } else {
                    // store property (property type is known and doesn't exist yet)
                    await this.#storePropertyToDB(elem, classId);
                }
            }
        }
    }

    /**
     * @param {Property} elem
     * @param {Id} classId
     */
    async #storePropertyToDB(elem, classId) {
        let property_table = this.#sql.getSchema().table('Property');
        let property_row = property_table.createRow({
                                                        name: elem.definition.name,
                                                        classId: classId,
                                                        type: elem.definition.typeName
                                                    });
        await this.#sql.insertOrReplace().into(property_table).values([property_row]).exec();
    }

    /**
     * @param {Property} elem
     * @param {Id} classId
     */
    async #modifyPropertyInDB(elem, classId) {
        let property = await this.tryGetPropertyEntryByName(classId, elem.definition.name);

        let property_table = this.#sql.getSchema().table('Property');
        let property_row = property_table.createRow({
                                                        name: elem.definition.name,
                                                        classId: classId,
                                                        type: elem.definition.typeName,
                                                        id: property.id
                                                    });
        await this.#sql.insertOrReplace().into(property_table).values([property_row]).exec();
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
