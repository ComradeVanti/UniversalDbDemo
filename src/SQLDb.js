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
 * @typedef {Object} ClassEntry
 * @property {Id} id
 * @property {string} name
 * @property {Id} superClassId
 */

/**
 * @typedef {Object} PropertyEntry
 * @property {Id} id
 * @property {string} name
 * @property {Id} classId
 * @property {string} value
 */

export default class SQLDb {

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
     * @return {Promise<SQLDb>}
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
        return new SQLDb(db);
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
     * @param {string} name
     * @return {Promise<ClassEntry|null>}
     */
    async tryGetClassByName(name) {
        let table = this.#getClassTable()
        let rows = await this.db.select()
            .from(table)
            .where(table.name.eq(name))
            .exec()
        return rows[0] ?? null
    }

    /**
     * @param {Id} id
     * @return {Promise<ClassEntry|null>}
     */
    async tryGetClassById(id) {
        let table = this.#getClassTable()
        let rows = await this.db.select()
            .from(table)
            .where(table.id.eq(id))
            .exec()
        return rows[0] ?? null
    }

    /**
     * @param {Id} classId
     * @param {string} name
     * @return {Promise<PropertyEntry|null>}
     */
    async tryGetPropertyByName(classId, name) {
        let table = this.#getPropertyTable()
        let rows = await this.db.select()
            .from(table)
            .where(table.classId.eq(classId) && table.name.eq(name))
            .exec()
        return rows[0] ?? null
    }

    /**
     * @param {string} name
     * @param {Id} superId
     * @return {Promise<Id, null>}
     */
    async tryInsertClass(name, superId) {
        try {
            let table = this.#getClassTable()
            let row = table.createRow({name, superId});
            let results = await this.db.insert().into(table).values([row]).exec();
            return results[0].id
        } catch (e) {
            return null
        }
    }

    /**
     * @param {Id} id
     * @param {string} name
     * @param {Id} superId
     * @return {Promise}
     */
    async tryUpdateClass(id, name, superId) {
        try {
            let table = this.#getClassTable()
            await this.db.update(table)
                .where(table.id.eq(id))
                .set(table.name, name)
                .set(table.superId, superId)
                .exec()
        } catch (e) {
            return null
        }
    }

    /**
     * @param {string} name
     * @param {Id} classId
     * @param {string} value
     * @return {Promise<Id|null>}
     */
    async tryInsertProperty(name, classId, value) {
        try {
            let table = this.#getPropertyTable()
            let row = await table.createRow({name, classId, value});
            let results = await this.db.insert().into(table).values([row]).exec();
            return results[0].id
        } catch (e) {
            return null
        }
    }

    /**
     * @param {Id} id
     * @param {string} name
     * @param {Id} classId
     * @param {string} value
     * @return {Promise}
     */
    async tryUpdateProperty(id, name, classId, value) {
        try {
            let table = this.#getPropertyTable()
            await this.db.update(table)
                .where(table.id.eq(id))
                .set(table.name, name)
                .set(table.classId, classId)
                .set(table.value, value)
                .exec()
        } catch (e) {
            return null
        }
    }

}
