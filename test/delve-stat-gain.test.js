const assert = require("node:assert/strict");
const Module = require("node:module");
const { requiredStat } = require("../scripts/delve-helpers");
const { assertValidMaximizer } = require("./maximizer-syntax");

const level = 300;
const required = requiredStat(level);

function run(gainCallsNeeded) {
    const state = {
        adventures: 1,
        basementLevel: level,
        mysticality: 500,
        gainCommands: [],
        maximizeCommands: [],
        printed: []
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
            if (command.startsWith("maximize ")) state.maximizeCommands.push(command);
            if (command.startsWith("gain ")) {
                state.gainCommands.push(command);
                if (state.gainCommands.length >= gainCallsNeeded) {
                    state.mysticality = Math.ceil(required);
                }
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
        inebrietyLimit: () => 15,
        itemAmount: () => 10,
        jumpChance: () => 100,
        monsterHp: () => 100,
        myAdventures: () => state.adventures,
        myBasestat: () => 100,
        myBuffedstat: (stat) => stat.name === "Mysticality" ? state.mysticality : 100,
        myHp: () => 1000,
        myInebriety: () => 0,
        myLevel: () => 30,
        myMeat: () => 1000000,
        myPrimestat: () => gameValue("Mysticality"),
        myMaxhp: () => 1000,
        myMaxmp: () => 1000,
        myMp: () => 1000,
        myPath: () => gameValue("none"),
        print: (message) => state.printed.push(message),
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
        // KoLmafia capitalizes stat names, which STAT_BUFFS keys rely on.
        toStat: (name) => gameValue(name.charAt(0).toUpperCase() + name.slice(1)),
        useSkill: () => true,
        userConfirm: () => true,
        visitUrl: (url) => {
            if (url.startsWith("basement.php?action=") && state.mysticality >= required) {
                state.basementLevel++;
                state.adventures--;
            }
            return `Fernswarthy's Basement, Level ${state.basementLevel} voodoo.gif`;
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
    return state;
}

// Gain reaches the target on its second call.
const passed = run(2);
assert.deepEqual(
    passed.gainCommands,
    Array(2).fill(`gain ${Math.ceil(required)} mysticality 1 turns`),
    "Delve must ask Gain for the missing buffed stat"
);
assert.equal(passed.basementLevel, level + 1, "Delve must pass the stat test after Gain");
assert.ok(passed.maximizeCommands.length > 0, "Delve must maximize the stat before buying potions");
passed.maximizeCommands.forEach(assertValidMaximizer);

// Gain never reaches the target, so Delve stops after its three calls.
const failed = run(Infinity);
assert.equal(failed.gainCommands.length, 3, "Delve must stop calling Gain after three tries");
assert.equal(failed.basementLevel, level, "Delve must not dive when the stat is still short");
assert.ok(
    failed.printed.some((message) => /You need \d+ more Mysticality/.test(message)),
    "Delve must report the missing stat"
);
