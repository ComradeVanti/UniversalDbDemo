import {classTableName} from "./constants.mjs";
import {
    classWithNameExists, getSuperClassName,
    tryGetClassIdByName, getThingTypeName,
    getProperties, propertyExistsInClass,
    propertyIsUnknownInClass,
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
        await insertClassFor(thing, db);
    }

    await insertProperties(thing, db);
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

/**
 * @param {Object} thing
 * @param {lf.Database} db
 * @return {Promise}
 */
async function insertProperties(thing, db) {
    let propertyProps = getProperties(thing);
    
    for (let elem of propertyProps) {
        let property_table = null;
        let property_row = null;

        let className = getThingTypeName(thing);
        let classId = await tryGetClassIdByName(className, db);

        console.log(elem);

        if (elem.definition.typeName === "Unknown") {
            // property name is unknown
            if (await propertyExistsInClass(elem.definition.name, className, db) === false) {
                property_table = db.getSchema().table('Property');
                property_row = property_table.createRow({
                    name: elem.definition.name,
                    classId: classId,
                    type: elem.definition.typeName
                });
                let result = await db.insertOrReplace().into(property_table).values([property_row]).exec();
                console.log(result);
            }
        } else {
            if (await propertyIsUnknownInClass(elem.definition.name, className, db)) {
                console.log("modify existig data");
            } else if (await propertyExistsInClass(elem.definition.name, className, db)) {
                continue;
            } else {
                property_table = db.getSchema().table('Property');
                property_row = property_table.createRow({
                    name: elem.definition.name,
                    classId: classId,
                    type: elem.definition.typeName
                });
                let result = await db.insertOrReplace().into(property_table).values([property_row]).exec();
                console.log(result);
            }
        }
    }

}