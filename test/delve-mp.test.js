const assert = require("node:assert/strict");
const Module = require("node:module");

let adventures = 1;
let basementLevel = 432;
let maxMp = 6941;
let currentMp = 6941;
let wine = 0;
let wineDrunk = 0;
let basementActions = 0;

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
    availableAmount: () => 0,
    canAdventure: () => true,
    cliExecute: (command) => {
        if (command === "drinksilent 1 mulled hobo wine") {
            if (wine < 1) return false;
            wine--;
            wineDrunk++;
            maxMp = 13196;
            currentMp = maxMp;
        }
        return true;
    },
    currentRound: () => 0,
    damageAbsorptionPercent: () => 0,
    drink: () => {
        throw new Error("An interactive drink prompt would block Delve");
    },
    eat: () => true,
    elementalResistance: () => 0,
    expectedDamage: () => 0,
    getProperty: () => "0",
    haveEffect: (effect) => effect.name === "Burnt 'n' Turnt" ? wineDrunk * 20 : 0,
    haveSkill: () => true,
    inebrietyLimit: () => 15,
    itemAmount: (item) => item.name === "mulled hobo wine" ? wine : 10,
    jumpChance: () => 100,
    monsterHp: () => 100,
    myAdventures: () => adventures,
    myBasestat: () => 100,
    myBuffedstat: () => 100,
    myHp: () => 1000,
    myInebriety: () => wineDrunk,
    myLevel: () => 30,
    myMaxhp: () => 1000,
    myMaxmp: () => maxMp,
    myMp: () => currentMp,
    myPath: () => gameValue("none"),
    print: () => {},
    putCloset: () => true,
    restoreHp: () => true,
    restoreMp: () => true,
    retrieveItem: (amount, item) => {
        if (item.name !== "mulled hobo wine") return true;
        wine += amount;
        return true;
    },
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
            basementActions++;
            basementLevel++;
            adventures--;
        }
        return `Fernswarthy's Basement, Level ${basementLevel} powderbox.gif`;
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

assert.equal(wineDrunk, 1, "Delve must use the MP drink after ordinary buffs fail");
assert.equal(basementActions, 1, "Delve must pass the MP test after using the drink");
