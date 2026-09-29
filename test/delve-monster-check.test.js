const assert = require("node:assert/strict");
const Module = require("node:module");

let maximized = false;
let basementStarts = 0;
const printed = [];

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
        if (command.startsWith("maximize effective")) {
            maximized = true;
        }
        return true;
    },
    currentRound: () => 0,
    damageAbsorptionPercent: () => 0,
    eat: () => true,
    elementalResistance: () => 0,
    // 1000 damage per round against 2000 max HP survives two monster rounds.
    expectedDamage: () => 1000,
    getProperty: () => "0",
    haveEffect: () => 0,
    haveSkill: () => true,
    inebrietyLimit: () => 15,
    itemAmount: () => 10,
    jumpChance: () => 0,
    // Muscle needs 8 hits (6 after stuns); Mysticality would need 4 (2).
    monsterInitiative: () => 0,
    monsterHp: () => 8000,
    myAdventures: () => 1,
    myBasestat: () => 100,
    // Muscle is highest before maximizing, so Delve picks the noisemaker.
    // The maximizer then pushes Mysticality above it.
    myBuffedstat: (stat) => {
        if (stat.name === "Muscle") return 1000;
        if (stat.name === "Mysticality") return maximized ? 2000 : 500;
        return 100;
    },
    myHp: () => 2000,
    myInebriety: () => 0,
    myLevel: () => 30,
    myMaxhp: () => 2000,
    myMaxmp: () => 1000,
    myMp: () => 1000,
    myPath: () => gameValue("none"),
    print: (message) => printed.push(message),
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
            basementStarts++;
        }
        return "Fernswarthy's Basement, Level 413 beergolem.gif";
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

assert.equal(basementStarts, 0, "Delve must not fight with damage from a stat it is not throwing");
assert.ok(
    printed.some((message) => /Won't survive fighting/.test(message)),
    "Delve must refuse the fight with the chosen item's damage"
);
