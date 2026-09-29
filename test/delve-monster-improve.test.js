const assert = require("node:assert/strict");
const Module = require("node:module");
const { requiredDivineDamage } = require("../scripts/delve-helpers");

// Floor 266 as seen live: Moxie is the highest buffed stat, so Delve throws
// divine blowouts, but 956 damage is too little against a monster that always
// gets the jump. Gain must raise Moxie before the fight starts.
const state = {
    adventures: 1,
    round: 0,
    moxie: 956,
    basementStarts: 0,
    gains: []
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
    availableAmount: () => 10,
    canAdventure: () => true,
    cliExecute: (command) => {
        const gain = command.match(/^gain (\d+) moxie 1 turns$/);
        if (gain) {
            state.gains.push(Number(gain[1]));
            state.moxie = Math.max(state.moxie, Number(gain[1]));
        }
        return true;
    },
    currentRound: () => state.round,
    damageAbsorptionPercent: () => 0,
    eat: () => true,
    elementalResistance: () => 0,
    expectedDamage: () => 577,
    getProperty: () => "0",
    haveEffect: () => 0,
    haveSkill: () => true,
    inebrietyLimit: () => 15,
    itemAmount: () => 10,
    jumpChance: () => 0,
    monsterHp: () => 4232,
    monsterInitiative: () => 10000,
    myAdventures: () => state.adventures,
    myBasestat: () => 236,
    myBuffedstat: (stat) => {
        if (stat.name === "Moxie") return state.moxie;
        if (stat.name === "Muscle") return 579;
        return 507;
    },
    myHp: () => 1435,
    myInebriety: () => 0,
    myLevel: () => 30,
    myMaxhp: () => 1435,
    myMaxmp: () => 1000,
    myMp: () => 1000,
    myPath: () => gameValue("none"),
    print: () => {},
    putCloset: () => true,
    restoreHp: () => true,
    restoreMp: () => true,
    retrieveItem: () => true,
    takeCloset: () => true,
    throwItem: () => {
        state.round++;
        if (state.round >= 4) {
            state.round = 0;
            state.adventures = 0;
        }
        return "";
    },
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
        if (url.startsWith("basement.php?action=")) {
            state.basementStarts++;
            state.round = 1;
            return "fight.php";
        }
        return "Fernswarthy's Basement, Level 266 eyebeast.gif";
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

const target = requiredDivineDamage({
    attack: 577,
    hp: 4232,
    maxHp: 1435,
    divineDamage: 956,
    stunRounds: 2,
    ambushHits: 1
});
assert.deepEqual(state.gains, [target], "Delve must gain the Moxie the blowouts need");
assert.equal(state.basementStarts, 1, "Delve must fight once the blowouts hit hard enough");
