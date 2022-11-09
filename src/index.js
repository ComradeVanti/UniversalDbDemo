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

let allTypes = [Vehicle, Car, Person]

window.onload = async () => {
    await showcaseDb()
}

/**
 * @return {Promise<UniversalDb>}
 */
async function makeEmptyDb() {
    let dbModule = await import("./UniversalDb.mjs")
    return dbModule.default.makeEmpty()
}

async function showcaseDb() {
    let db = await makeEmptyDb();
    let utils = await import("./typeUtils.mjs")

    let greenCar = new Car("Green")
    let redCar = new Car("Red")
    let yellowCar = new Car("Yellow")

    let michelle = new Person("Michelle", greenCar, null)
    let ramon = new Person("Ramon", redCar, greenCar)
    let michael = new Person("Michael", null, yellowCar)

    let michelleId = await db.store(michelle)
    let ramonId = await db.store(ramon)
    let michaelId = await db.store(michael)

    let loadedRamon = await db.tryLoad(ramonId, allTypes)
    console.log(loadedRamon)
    console.log(areEqual(ramon, loadedRamon))
}

function areEqual(obj1, obj2) {
    let entries1 = Object.entries(obj1)
    let entries2 = Object.entries(obj2)
    return entries1 + "" === entries2 + ""
}
