const ClassTableName = "Class"
const PropertyTableName = "Property"
const ObjectTableName = "Object"
const ValueTableName = "Value"
const LFConstraintError = 200

/**
 * @typedef {Object} ClassEntry
 * @property {Id} id
 * @property {string} name
 * @property {Id|null} superId
 */

/**
 * @typedef {Object} PropertyEntry
 * @property {Id} id
 * @property {string} name
 * @property {Id} classId
 * @property {string} type
 */

/**
 * @typedef {Object} ObjectEntry
 * @property {Id} id
 * @property {Id} classId
 */

/**
 * @typedef {Object} ValueEntry
 * @property {Id} id
 * @property {Id} propId
 * @property {Id} objectId
 * @property {string} value
 */

/**
 * @readonly
 * @enum {number}
 */
export const SQLErrorCode = {
    Mystery: 0,
    ItemNotFound: 1,
    DuplicateClassName: 2
}

/**
 * @param {SQLErrorCode} code
 * @constructor
 */
export function SQLError(code) {
    /**
     * @type {SQLErrorCode}
     */
    this.code = code
}

export const MysteryError =
    new SQLError(SQLErrorCode.Mystery)

export const ItemNotFoundError =
    new SQLError(SQLErrorCode.ItemNotFound)

export const DuplicateClassNameError =
    new SQLError(SQLErrorCode.DuplicateClassName)


export default class SQLDb {

    /**
     * @type{lf.Database}
     */
    #db


    /**
     * @param {lf.Database} db
     */
    constructor(db) {
        this.#db = db
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
     * Get tables
     */
    /**
     * @param {string} name
     * @return {lf.schema.Table}
     */
    #getTable(name) {
        return this.#db.getSchema().table(name)
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
     * @return {lf.schema.Table}
     */
    #getObjectTable() {
        return this.#getTable(ObjectTableName)
    }

    /**
     * @return {lf.schema.Table}
     */
    #getValueTable() {
        return this.#getTable(ValueTableName)
    }

    /**
     * Class methods
     */
    /**
     * @param {string} name
     * @param {Id|null} superId
     * @return {Promise<Id, SQLError>}
     */
    async tryInsertClass(name, superId) {
        let table = this.#getClassTable()
        let row = table.createRow({name, superId});
        let query = this.#db.insert().into(table).values([row])
        try {
            let results = await query.exec();
            return results[0].id
        } catch (e) {
            if (e.code === LFConstraintError)
                return DuplicateClassNameError
            else
                return MysteryError
        }
    }

    /**
     * @param {Id} id
     * @param {string} name
     * @param {Id} superId
     * @return {Promise<Nothing|SQLError>}
     */
    async tryUpdateClass(id, name, superId) {
        let table = this.#getClassTable()
        let query = this.#db.update(table)
            .where(table.id.eq(id))
            .set(table.name, name)
            .set(table.superId, superId)
        try {
            let rows = await query.exec()
            if (rows.length === 0) return ItemNotFoundError
        } catch (e) {
            if (e.code === LFConstraintError)
                return DuplicateClassNameError
            else
                return MysteryError
        }
    }

    /**
     * @param {string} name
     * @return {Promise<ClassEntry|SQLError>}
     */
    async tryGetClassByName(name) {
        let table = this.#getClassTable()
        let query = this.#db.select()
            .from(table)
            .where(table.name.eq(name))
        let rows = await query.exec()
        return rows[0] ?? ItemNotFoundError
    }

    /**
     * @param {Id} id
     * @return {Promise<ClassEntry|SQLError>}
     */
    async tryGetClassById(id) {
        let table = this.#getClassTable()
        let query = this.#db.select()
            .from(table)
            .where(table.id.eq(id))
        let rows = await query.exec()
        return rows[0] ?? ItemNotFoundError
    }

    /**
     * Property methods
     */
    /**
     * @param {string} name
     * @param {Id} classId
     * @param {string} type
     * @return {Promise<Id|SQLError>}
     */
    async tryInsertProperty(name, classId, type) {
        let table = this.#getPropertyTable()
        let row = await table.createRow({name, classId, type});
        let query = this.#db.insert().into(table).values([row])
        try {
            let results = await query.exec();
            return results[0].id
        } catch (e) {
            return MysteryError
        }
    }

    /**
     * @param {Id} id
     * @param {string} name
     * @param {Id} classId
     * @param {string} type
     * @return {Promise<Nothing|SQLError>}
     */
    async tryUpdateProperty(id, name, classId, type) {
        let table = this.#getPropertyTable()
        let query = this.#db.update(table)
            .where(table.id.eq(id))
            .set(table.name, name)
            .set(table.classId, classId)
            .set(table.type, type)
        try {
            await query.exec()
        } catch (e) {
            if (e.code === LFConstraintError)
                return ItemNotFoundError
            else
                return MysteryError
        }
    }

    /**
     * @param {Id} classId
     * @param {string} name
     * @return {Promise<PropertyEntry|SQLError>}
     */
    async tryGetPropertyByName(classId, name) {
        let table = this.#getPropertyTable()
        let query = this.#db.select()
            .from(table)
            .where(table.classId.eq(classId) && table.name.eq(name))
        let rows = await query.exec()
        return rows[0] ?? ItemNotFoundError
    }

    /**
     * @param {Id} classId
     * @return {Promise<PropertyEntry[]>}
     */
    tryGetPropertiesByClassId(classId) {
        let table = this.#getPropertyTable()
        return this.#db.select()
            .from(table)
            .where(table.classId.eq(classId))
            .exec()
    }

    /**
     * Object methods
     */
    /**
     * @param {Id} classId
     * @return {Promise<Id|SQLError>}
     */
    async tryInsertObject(classId) {
        try {
            let table = this.#getObjectTable()
            let row = await table.createRow({classId});
            let query = this.#db.insert().into(table).values([row])
            let results = await query.exec();
            return results[0].id
        } catch (e) {
            return MysteryError
        }
    }

    /**
     * @param {Id} id
     * @return {Promise<ObjectEntry|SQLError>}
     */
    async tryGetObjectById(id) {
        let table = this.#getObjectTable()
        let query = this.#db.select()
            .from(table)
            .where(table.id.eq(id))
        let rows = await query.exec()
        return rows[0] ?? ItemNotFoundError
    }

    /**
     * Value methods
     */
    /**
     * @param {Id} propId
     * @param {Id} objectId
     * @param {string} value
     * @return {Promise<Id|SQLError>}
     */
    async tryInsertValue(propId, objectId, value) {
        let table = this.#getValueTable()
        let row = await table.createRow({propId, objectId, value});
        let query = this.#db.insert().into(table).values([row])
        try {
            let results = await query.exec();
            return results[0].id
        } catch (e) {
            return MysteryError
        }
    }

    /**
     * @param {Id} id
     * @return {Promise<ValueEntry|SQLError>}
     */
    async tryGetValueById(id) {
        let table = this.#getValueTable()
        let query = this.#db.select()
            .from(table)
            .where(table.id.eq(id))
        let rows = await query.exec()
        return rows[0] ?? ItemNotFoundError
    }

}
