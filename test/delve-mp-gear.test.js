const assert = require("node:assert/strict");
const Module = require("node:module");
const { requiredMp } = require("../scripts/delve-helpers");
const { assertValidMaximizer } = require("./maximizer-syntax");

// Floor 346 as seen live: the MP test equipped MP gear, then maximized
// Mysticality and lost it, and could not drink at the drunk limit.
const level = 346;
const required = requiredMp(level);
const state = {
    adventures: 1,
    basementLevel: level,
    mpGear: false,
    gainedMp: 0,
    commands: []
};
const maxMp = () => Math.floor(required) - 800 + (state.mpGear ? 400 : 0) + state.gainedMp;

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
        if (command.startsWith("maximize ")) {
            state.mpGear = /^maximize mp,/.test(command);
        }
        const gain = command.match(/^gain (\d+) mp 1 turns$/);
        if (gain && state.commands.filter((c) => c.startsWith("gain ")).length >= 2) {
            state.gainedMp = Number(gain[1]) - maxMp() + state.gainedMp;
        }
        return true;
    },
    currentRound: () => 0,
    damageAbsorptionPercent: () => 0,
    eat: () => true,
    elementalResistance: () => 0,
    expectedDamage: () => 0,
    getProperty: () => "0",
    haveEffect: () => 0,
    haveSkill: () => true,
    inebrietyLimit: () => 14,
    itemAmount: () => 10,
    jumpChance: () => 100,
    monsterHp: () => 100,
    myAdventures: () => state.adventures,
    myBasestat: () => 100,
    myBuffedstat: () => 100,
    myHp: () => 1000,
    myInebriety: () => 14,
    myLevel: () => 30,
    myMaxhp: () => 1000,
    myMaxmp: maxMp,
    myMp: maxMp,
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
    useSkill: () => true,
    userConfirm: () => true,
    visitUrl: (url) => {
        if (url.startsWith("basement.php?action=") && maxMp() > required) {
            state.basementLevel++;
            state.adventures--;
        }
        return `Fernswarthy's Basement, Level ${state.basementLevel} powderbox.gif`;
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

const maximizes = state.commands.filter((command) => command.startsWith("maximize "));
maximizes.forEach(assertValidMaximizer);
assert.ok(maximizes.every((command) => /^maximize mp,/.test(command)), "Delve must keep its MP gear on during the MP test");
assert.equal(state.commands.filter((c) => c.startsWith("gain ")).length, 2, "Delve must keep calling Gain until the MP test passes");
assert.ok(!state.commands.some((c) => c.startsWith("drinksilent")), "Delve must not drink at the drunk limit");
assert.equal(state.basementLevel, level + 1, "Delve must pass the MP test");
