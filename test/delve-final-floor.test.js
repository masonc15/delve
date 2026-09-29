const assert = require("node:assert/strict");
const Module = require("node:module");

let adventures = 2;
let basementLevel = 499;
let level500PageVisits = 0;

const cache = new Map();
function gameValue(name, extra) {
    if (!cache.has(name)) {
        cache.set(name, Object.assign({
            name,
            id: cache.size + 1,
            toString: () => name
        }, extra));
    }
    return cache.get(name);
}

const fakeKolmafia = {
    availableAmount: () => 10,
    canAdventure: () => true,
    cliExecute: () => true,
    currentRound: () => 0,
    damageAbsorptionPercent: () => 0,
    eat: () => true,
    elementalResistance: () => 0,
    expectedDamage: () => 0,
    getProperty: () => "0",
    haveEffect: () => 0,
    haveSkill: () => true,
    inebrietyLimit: () => 15,
    itemAmount: () => 10,
    jumpChance: () => 100,
    monsterHp: () => 100,
    myAdventures: () => adventures,
    myBasestat: () => 100,
    myBuffedstat: () => 100,
    myHp: () => 1000,
    myInebriety: () => 0,
    myLevel: () => 30,
    myMeat: () => 1000000,
    myPrimestat: () => gameValue("Mysticality"),
    myMaxhp: () => 1000,
    myMaxmp: () => 1000,
    myMp: () => 1000,
    myPath: () => gameValue("none"),
    print: () => {},
    putCloset: () => true,
    restoreHp: () => true,
    restoreMp: () => true,
    retrieveItem: () => true,
    takeCloset: () => true,
    throwItem: () => true,
    toEffect: (name) => gameValue(name, { default: "" }),
    toElement: (name) => gameValue(name),
    toItem: (name) => gameValue(name),
    toLocation: (name) => gameValue(name),
    toMonster: (name) => gameValue(name, { physicalResistance: 0 }),
    toSkill: (name) => gameValue(name),
    toStat: (name) => gameValue(name),
    useSkill: () => true,
    userConfirm: () => true,
    visitUrl: (url) => {
        if (url.startsWith("basement.php?action=")) {
            basementLevel++;
            adventures--;
        } else if (basementLevel === 500) {
            level500PageVisits++;
        }
        const image = basementLevel === 500 ? "chest" : "angel";
        return `Fernswarthy's Basement, Level ${basementLevel} ${image}.gif`;
    }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === "kolmafia") return fakeKolmafia;
    return originalLoad.call(this, request, parent, isMain);
};

try {
    delete require.cache[require.resolve("../scripts/delve")];
    require("../scripts/delve").main("");
} finally {
    Module._load = originalLoad;
}

assert.equal(level500PageVisits, 1, "Delve must stop after it completes floor 499");
