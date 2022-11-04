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

schemaBuilder.createTable("Class_Rel")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("formClassId", lf.Type.INTEGER)
    .addColumn("toClassId", lf.Type.INTEGER)
    .addColumn("propertyId", lf.Type.INTEGER)
    .addPrimaryKey(["id"])
    .addForeignKey("fk_fromClassId", {
        local: "fromClassId",
        ref: "Class.id"
    })
    .addForeignKey("fk_tolassId", {
        local: "toClassId",
        ref: "Class.id"
    })
    .addForeignKey("fk_propertyId", {
        local: "propertyId",
        ref: "Property.id"
    })

schemaBuilder.createTable("Object_Rel")
    .addColumn("id", lf.Type.INTEGER)
    .addColumn("fromObjectId", lf.Type.INTEGER)
    .addColumn("toObjectId", lf.Type.INTEGER)
    .addColumn("classRelId", lf.Type.INTEGER)
    .addColumn("valueId", lf.Type.INTEGER)
    .addPrimaryKey(["id"])
    .addForeignKey("fk_fromObjectId", {
        local: "fromObjectId",
        ref: "Object.id"
    })
    .addForeignKey("fk_toObjectId", {
        local: "toObjectId",
        ref: "Object.id"
    })
    .addForeignKey("fk_classRelId", {
        local: "classRelId",
        ref: "Class_Rel.id"
    })
    .addForeignKey("fk_valueId", {
        local: "valueId",
        ref: "Value.id"
    })
    