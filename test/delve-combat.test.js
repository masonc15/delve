const assert = require("node:assert/strict");
const Module = require("node:module");

let adventures = 1;
let round = 0;
let basementStarts = 0;
let noisemakers = 10;
const combatActions = [];

const cache = new Map();
function gameValue(name, extra) {
    if (!cache.has(name)) {
        cache.set(name, Object.assign({ name, id: cache.size + 1 }, extra));
    }
    return cache.get(name);
}

const fakeKolmafia = {
    adv1: () => {
        throw new Error("Delve must not use the JavaScript adv1 combat callback");
    },
    availableAmount: () => 10,
    canAdventure: () => true,
    cliExecute: () => true,
    currentRound: () => round,
    damageAbsorptionPercent: () => 0,
    eat: () => true,
    elementalResistance: () => 0,
    expectedDamage: () => 0,
    getProperty: (name) => name === "customCombatScript" ? "wham" : "0",
    haveEffect: () => 0,
    haveSkill: () => true,
    inebrietyLimit: () => 15,
    itemAmount: (item) => {
        if (item.name === "divine noisemaker") return noisemakers;
        if (item.name.startsWith("divine ") || item.name === "gas balloon") return 10;
        return 0;
    },
    jumpChance: () => 100,
    monsterHp: () => 100,
    myAdventures: () => adventures,
    myBasestat: () => 100,
    myBuffedstat: (stat) => stat.name === "Muscle" ? 1000 : 100,
    myHp: () => 1000,
    myInebriety: () => 0,
    myLevel: () => 30,
    myMaxhp: () => 1000,
    myMaxmp: () => 1000,
    myMp: () => 1000,
    myPath: () => gameValue("none"),
    print: () => {},
    putCloset: () => true,
    restoreHp: () => true,
    restoreMp: () => true,
    retrieveItem: () => true,
    runCombat: () => {
        throw new Error("Delve must not use WHAM for basement monsters");
    },
    takeCloset: () => true,
    throwItem: (item) => {
        combatActions.push(item.name);
        if (item.name === "divine noisemaker") {
            noisemakers--;
            if (noisemakers === 8) {
                round = 0;
                adventures = 0;
                return "fight complete";
            }
        }
        round++;
        return "combat continues";
    },
    throwItems: () => {
        throw new Error("Delve must not use two items without Funkslinging");
    },
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
            round = 1;
            return "fight.php";
        }
        return "Fernswarthy's Basement, Level 413 beergolem.gif";
    }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === "kolmafia") {
        return fakeKolmafia;
    }
    return originalLoad.call(this, request, parent, isMain);
};

try {
    delete require.cache[require.resolve("../scripts/delve")];
    require("../scripts/delve").main("");
} finally {
    Module._load = originalLoad;
}

assert.equal(basementStarts, 1, "Delve must start one basement combat");
assert.deepEqual(
    combatActions,
    ["gas balloon", "divine noisemaker", "divine noisemaker"],
    "Delve must use one combat item per round"
);
