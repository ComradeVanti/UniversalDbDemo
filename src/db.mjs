import {classTableName} from "./constants.mjs";
import {
    classWithNameExists, getSuperClassName,
    tryGetClassIdByName, getThingTypeName
} from "./utils.mjs"

/**
 * @return {Promise<lf.Database>}
 */
export function makeDb() {

    let schemaBuilder = lf.schema.create("main", 1);
    schemaBuilder.createTable(classTableName)
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

    schemaBuilder.createTable("Property")
        .addColumn("id", lf.Type.INTEGER)
        .addColumn("name", lf.Type.STRING)
        .addColumn("classId", lf.Type.INTEGER)
        .addColumn("type", lf.Type.STRING)
        .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
        .addForeignKey("fk_classId", {
            local: "classId",
            ref: "Class.id"
        })

    schemaBuilder.createTable("Object")
        .addColumn("id", lf.Type.INTEGER)
        .addColumn("classId", lf.Type.INTEGER)
        .addPrimaryKey([{name: "id", 'autoIncrement': true, order: lf.Order.DESC}])
        .addForeignKey("fk_classId", {
            local: "classId",
            ref: "Class.id"
        })

    schemaBuilder.createTable("Value")
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

    return schemaBuilder.connect();
}

/**
 * @param {Object} thing
 * @param {lf.Database} db
 * @return {Promise}
 */
export async function store(thing, db) {
    if (!(await classWithNameExists(getThingTypeName(thing), db))) {
        await insertClassFor(thing, db)
    }
}

/**
 * @param {Object} thing
 * @param {lf.Database} db
 * @return {Promise}
 */
async function insertClassFor(thing, db) {
    let superClassName = getSuperClassName(thing);

    let superClassID = null;
    if (superClassName !== null) {
        superClassID = await tryGetClassIdByName(superClassName, db)
    }

    let class_table = db.getSchema().table('Class');
    let class_row = class_table.createRow({
                                              name: getThingTypeName(thing),
                                              superId: superClassID,
                                          });

    await db.insertOrReplace().into(class_table).values([class_row]).exec();
}
