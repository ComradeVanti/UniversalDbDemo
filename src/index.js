class Vehicle {

    /**
     * @type {number}
     */
    wheelCount


    /**
     * @param {number} wheelCount
     */
    constructor(wheelCount) {
        this.wheelCount = wheelCount
    }

}

class Car extends Vehicle {

    /**
     * @type {string}
     */
    colorName


    /**
     *
     * @param {string} colorName
     */
    constructor(colorName) {
        super(4);
        this.colorName = colorName
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


    /**
     * @param {string} name
     * @param {Car} workCar
     * @param {Car} privateCar
     */
    constructor(name, workCar, privateCar) {
        this.name = name
        this.workCar = workCar
        this.privateCar = privateCar
    }

}

window.onload = async () => {
    let dbModule = await import("./UniversalDb.mjs")
    let db = await dbModule.default.makeEmpty()

    let greenCar = new Car("Green")
    let redCar = new Car("Red")
    let yellowCar = new Car("Yellow")

    let michelle = new Person("Michelle", greenCar, null)
    let ramon = new Person("Ramon", redCar, greenCar)
    let michael = new Person("Michi", null, yellowCar)

    await db.store(michelle)
    await db.store(ramon)
    await db.store(michael)
}
