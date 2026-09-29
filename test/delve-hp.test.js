const assert = require("node:assert/strict");
const Module = require("node:module");
const { requiredHp } = require("../scripts/delve-helpers");
const { assertValidMaximizer } = require("./maximizer-syntax");

// Floor 204 as seen live: the shells raise DA partway through the HP test, so
// the damage Delve must cover drops after its first requirement check.
const level = 204;
const state = {
    adventures: 1,
    basementLevel: level,
    damageAbsorption: 50,
    maxHp: 3087,
    commands: []
};

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
        state.commands.push(command);
        const gain = command.match(/^gain (\d+) hp 1 turns$/);
        if (gain) state.maxHp = Math.max(state.maxHp, Number(gain[1]));
        return true;
    },
    currentRound: () => 0,
    damageAbsorptionPercent: () => state.damageAbsorption,
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
    myAdventures: () => state.adventures,
    myBasestat: () => 100,
    myBuffedstat: () => 100,
    myHp: () => state.maxHp,
    myInebriety: () => 0,
    myLevel: () => 30,
    myMeat: () => 1000000,
    myPrimestat: () => gameValue("Mysticality"),
    myMaxhp: () => state.maxHp,
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
    toStat: (name) => gameValue(name.charAt(0).toUpperCase() + name.slice(1)),
    useSkill: () => {
        state.damageAbsorption = 80;
        return true;
    },
    userConfirm: () => true,
    visitUrl: (url) => {
        if (url.startsWith("basement.php?action=")
            && state.maxHp > requiredHp(level, state.damageAbsorption)) {
            state.basementLevel++;
            state.adventures--;
        }
        return `Fernswarthy's Basement, Level ${state.basementLevel} haiku11.gif`;
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

state.commands
    .filter((command) => command.startsWith("maximize "))
    .forEach(assertValidMaximizer);

const gains = state.commands.filter((command) => command.startsWith("gain "));
assert.deepEqual(
    gains,
    [`gain ${Math.ceil(requiredHp(level, 80) + 1)} hp 1 turns`],
    "Delve must ask Gain for the HP the current DA requires"
);
assert.equal(state.basementLevel, level + 1, "Delve must pass the HP test after Gain");
