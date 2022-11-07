import {
    getProperties,
    getSuperClassName,
    getThingTypeName,
    UnknownType
} from "./typeUtils.mjs";

const ClassTableName = "Class"
const PropertyTableName = "Property"
const ObjectTableName = "Object"
const ValueTableName = "Value"

/**
 * @typedef {Object} PropertyEntry
 * @property {Id} id
 * @property {string} name
 * @property {Id} classId
 * @property {string} value
 */

export default class UniversalDb {

    /**
     * @type{lf.Database}
     */
    db


    /**
     * @param {lf.Database} db
     */
    constructor(db) {
        this.db = db
    }


    /**
     * @return {Promise<UniversalDb>}
     */
    static async makeEmpty() {

        let schemaBuilder = lf.schema.create("main", 1);
        schemaBuilder.createTable(ClassTableName)
            .addColumn("id", lf.Type.INTEGER)
            .addColumn("name", lf.Type.STRING)
            .addColumn("superId", lf.Type.INTEGER)
            .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
            .addNullable(["superId"])
            .addForeignKey("fk_superId", {
                local: "superId",
                ref: "Class.id"
            })
            .addUnique('uq_name', ['name'])

        schemaBuilder.createTable(PropertyTableName)
            .addColumn("id", lf.Type.INTEGER)
            .addColumn("name", lf.Type.STRING)
            .addColumn("classId", lf.Type.INTEGER)
            .addColumn("type", lf.Type.STRING)
            .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
            .addForeignKey("fk_classId", {
                local: "classId",
                ref: "Class.id"
            })

        schemaBuilder.createTable(ObjectTableName)
            .addColumn("id", lf.Type.INTEGER)
            .addColumn("classId", lf.Type.INTEGER)
            .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
            .addForeignKey("fk_classId", {
                local: "classId",
                ref: "Class.id"
            })

        schemaBuilder.createTable(ValueTableName)
            .addColumn("id", lf.Type.INTEGER)
            .addColumn("propId", lf.Type.INTEGER)
            .addColumn("objectId", lf.Type.INTEGER)
            .addColumn("value", lf.Type.STRING)
            .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
            .addForeignKey("fk_propId", {
                local: "propId",
                ref: "Property.id"
            })
            .addForeignKey("fk_objectId", {
                local: "objectId",
                ref: "Object.id"
            })

        let db = await schemaBuilder.connect()
        return new UniversalDb(db);
    }

    /**
     * @param {string} name
     * @return {lf.schema.Table}
     */
    #getTable(name) {
        return this.db.getSchema().table(name)
    }

    /**
     * @return {lf.schema.Table}
     */
    #getClassTable() {
        return this.#getTable(ClassTableName)
    }

    /**
     * @return {lf.schema.Table}
     */
    #getPropertyTable() {
        return this.#getTable(PropertyTableName)
    }

    /**
     * @param {Id} classId
     * @param {string} name
     * @return {Promise<PropertyEntry|null>}
     */
    async tryGetPropertyEntryByName(classId, name) {
        let propertyTable = this.#getPropertyTable()
        let rows = await this.db.select()
            .from(propertyTable)
            .where(propertyTable.classId.eq(classId) && propertyTable.name.eq(name))
            .exec()
        return rows[0] ?? null
    }

    /**
     * @param {string} name
     * @return {Promise<Id|null>}
     */
    async tryGetClassIdByName(name) {
        let classTable = this.#getClassTable()
        let rows = await this.db.select(classTable.id)
            .from(classTable)
            .where(classTable.name.eq(name))
            .exec();
        return rows[0]?.id ?? null
    }

    /**
     * @param {string} name
     * @return {Promise<Id[]>}
     */
    async getPropertyIdsForName(name) {
        let propertyTable = this.#getPropertyTable()
        let rows = await this.db.select(propertyTable.id)
            .from(propertyTable)
            .where(propertyTable.name.eq(name))
            .exec()
        return rows.map(row => row.id)
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<Id|null>}
     */
    async tryGetPropertyId(propertyName, className) {
        let propertyTable = this.#getPropertyTable()
        let rows = await this.db.select(propertyTable.id)
            .from(propertyTable)
            .where(propertyTable.name.eq(propertyName))
            .exec()
        return rows.map(row => row.id)[0] ?? null
    }

    /**
     * @param {Id} classId
     * @return {Promise<PropertyDefinition[]>}
     */
    async getPropertyDefinitionsByClassId(classId) {
        let propertyTable = this.#getPropertyTable()
        let rows = await this.db.select()
            .from(propertyTable)
            .where(propertyTable.classId.eq(classId))
            .exec()
        return rows.map(row => ({name: row.name, typeName: row.type}))
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
        let classId = await this.tryGetClassIdByName(name)
        if (classId === null) return null
        return this.tryGetClassDefinitionById(classId)
    }

    /**
     * @param {string} propertyName
     * @param {string} className
     * @return {Promise<PropertyDefinition|null>}
     */
    async tryGetClassProperty(propertyName, className) {
        let classId = await this.tryGetClassIdByName(className);
        // If the class does not exist, we can't get the property
        if (classId === null) return null;
        let properties = await this.getPropertyDefinitionsByClassId(classId)
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
        let id = await this.tryGetClassIdByName(name)
        return id !== null
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

        await this.db.insertOrReplace().into(class_table).values([class_row]).exec();
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
        let property_table = this.db.getSchema().table('Property');
        let property_row = property_table.createRow({
            name: elem.definition.name,
            classId: classId,
            type: elem.definition.typeName
        });
        await this.db.insertOrReplace().into(property_table).values([property_row]).exec();
    }
    /**
     * @param {Property} elem
     * @param {Id} classId
     */
    async #modifyPropertyInDB(elem, classId) {
        let property = await this.tryGetPropertyEntryByName(classId, elem.definition.name);

        let property_table = this.db.getSchema().table('Property');
        let property_row = property_table.createRow({
            name: elem.definition.name,
            classId: classId,
            type: elem.definition.typeName,
            id: property.id
        });
        await this.db.insertOrReplace().into(property_table).values([property_row]).exec();
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
