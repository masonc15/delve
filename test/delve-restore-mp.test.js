const assert = require("node:assert/strict");
const Module = require("node:module");
const { requiredMp } = require("../scripts/delve-helpers");

const level = 432;
const required = requiredMp(level);
let adventures = 1;
let basementLevel = level;
let currentMp = 0;
let sausagesEaten = 0;

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
    availableAmount: () => 23,
    canAdventure: () => true,
    cliExecute: () => true,
    currentRound: () => 0,
    damageAbsorptionPercent: () => 0,
    eat: (item, count) => {
        sausagesEaten += count;
        currentMp += count * 999;
        return true;
    },
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
    myMaxmp: () => 10000,
    myMp: () => currentMp,
    myPath: () => gameValue("none"),
    print: () => {},
    putCloset: () => true,
    restoreHp: () => true,
    restoreMp: (target) => {
        currentMp = Math.max(currentMp, Math.min(target, 10000));
        return true;
    },
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
        // The MP test only passes with enough current MP.
        if (url.startsWith("basement.php?action=") && currentMp >= required) {
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

assert.equal(sausagesEaten, Math.floor(required / 1000), "Delve must eat sausages for whole thousands of missing MP");
assert.ok(currentMp >= required, "Delve must restore the MP the sausages did not cover");
assert.equal(basementLevel, level + 1, "Delve must pass the MP test after eating sausages");
