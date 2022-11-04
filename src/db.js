let schemaBuilder = lf.schema.create("main", 1);
schemaBuilder.createTable("Class")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("name", lf.Type.STRING)
    .addColumn("superId", lf.Type.INTEGER)
    .addPrimaryKey(["id"])
    .addNullable(["superId"])
    .addForeignKey("fk_superId", {
        local: "superId",
        ref: "Class.id"
    })

schemaBuilder.createTable("Property")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("name", lf.Type.STRING)
    .addColumn("classId", lf.Type.INTEGER)
    .addColumn("type", lf.Type.STRING)
    .addPrimaryKey(["id"])
    .addForeignKey("fk_classId", {
        local: "classId",
        ref: "Class.id"
    })

schemaBuilder.createTable("Object")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("classId", lf.Type.INTEGER)
    .addPrimaryKey(["id"])
    .addForeignKey("fk_classId", {
        local: "classId",
        ref: "Class.id"
    })

schemaBuilder.createTable("Value")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("propId", lf.Type.INTEGER)
    .addColumn("objectId", lf.Type.INTEGER)
    .addColumn("value", lf.Type.STRING)
    .addPrimaryKey(["id"])
    .addForeignKey("fk_propId", {
        local: "propId",
        ref: "Property.id"
    })
    .addForeignKey("fk_objectId", {
        local: "objectId",
        ref: "Object.id"
    })
