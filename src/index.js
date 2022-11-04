class Vehicle {
}

class Car extends Vehicle {

    /**
     * @type {string}
     */
    modelName

    constructor(modelName) {
        super();
        this.modelName = modelName
    }

}

class Person {

    /**
     * @type {string}
     */
    name
    /**
     * @type {Car}
     */
    workCar
    /**
     * @type {Car}
     */
    privateCar

    constructor(name, workCar, privateCar) {
        this.name = name
        this.workCar = workCar
        this.privateCar = privateCar
    }

}

window.onload = async () => {
    let Db = await import("./db.mjs")
    let instance = await Db.makeDb();

    let greenCar = new Car("Green")
    let redCar = new Car("Red")
    let yellowCar = new Car("Yellow")

    let michelle = new Person("Michelle", greenCar, null)
    let ramon = new Person("Ramon", redCar, greenCar)
    let michael = new Person("Michi", null, yellowCar)

    await Db.store(michelle, instance)
    await Db.store(ramon, instance)
    await Db.store(michael, instance)
}
