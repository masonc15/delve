const {
    myAdventures,
    visitUrl,
    toEffect,
    haveEffect,
    cliExecute,
    toStat,
    toElement,
    myBuffedstat,
    myBasestat,
    expectedDamage,
    monsterHp,
    myMaxhp,
    toMonster,
    toItem,
    retrieveItem,
    restoreHp,
    restoreMp,
    runCombat,
    myMaxmp,
    elementalResistance,
    print,
    jumpChance,
    damageAbsorptionPercent,
    getProperty,
    eat,
    availableAmount,
    itemAmount,
    putCloset,
    takeCloset,
    myMp,
    canAdventure,
    toLocation,
    userConfirm,
    myLevel,
    myHp,
    myPath,
    toSkill,
    haveSkill,
    useSkill
} = require('kolmafia');

const {
    getLevel,
    getChallenge,
    isUnrestrictedPath,
    requiredStat,
    requiredMp,
    requiredHp,
    requiredElement,
    canSurviveMonster
} = require('./delve-helpers');

// Stat objects
const MOX = toStat('Moxie');
const MYS = toStat('Mysticality');
const MUS = toStat('Muscle');

const DIVINE_COMBAT_ITEMS = [
    toItem('divine can of silly string'),
    toItem('divine blowout'),
    toItem('divine noisemaker')
];
const GAS_BALLOON = toItem('gas balloon');

const ALL_STAT_BUFFS = [
    toEffect('Gr8ness'),
    toEffect('Trivia Master'),
    toEffect('Tomato Power'),
    toEffect('Big'),
    toEffect('Triple-Sized')
];

const STAT_BUFFS = {
    Muscle: [
        toEffect('Phorcefullness'),
        toEffect('Quiet Determination')
    ],
    Mysticality: [
        toEffect('On the Shoulders of Giants'),
        toEffect('Mystically Oiled'),
        toEffect('Quiet Judgement')
    ],
    Moxie: [
        toEffect('Cock of the Walk'),
        toEffect('Superhuman Sarcasm'),
        toEffect('Quiet Desperation')
    ]
};

const STABILIZERS = {
    Muscle: 'Stabilizing Oiliness',
    Mysticality: 'Expert Oiliness',
    Moxie: 'Slippery Oiliness'
};

const RESISTANCE_BUFFS = {};
RESISTANCE_BUFFS[toElement('cold')] = [toEffect('Burning Hands')];
RESISTANCE_BUFFS[toElement('hot')] = [toEffect('Fireproof Lips')];
RESISTANCE_BUFFS[toElement('sleaze')] = [toEffect('Proprie Tea')];
RESISTANCE_BUFFS[toElement('spooky')] = [toEffect('Pleasant Forecast')];
RESISTANCE_BUFFS[toElement('stench')] = [toEffect('Net tea')];

const ALL_RESISTANCE_BUFFS = [
    toEffect('Patent Prevention'),
    toEffect('Oiled-Up'),
    toEffect('Protection from Bad Stuff')
];

const ARGS = {
    ignoreMonsterCheck: false
};

function isKnown(value) {
    return value && value.name && value.name.toLowerCase() !== 'none';
}

function currentPathName() {
    const path = myPath();
    return path && path.name ? path.name : String(path);
}

function retrieveRequired(amount, item) {
    if (!retrieveItem(amount, item) || itemAmount(item) < amount) {
        throw new Error("Could not retrieve " + amount + " " + item.name + ".");
    }
}

function restoreRequiredHp(amount) {
    if (!restoreHp(amount)) {
        throw new Error("Could not restore enough HP.");
    }
}

function customRestoreMp(amount) {
    if (amount >= 1000 && myMaxmp() - myMp() >= amount) {
        const sausagesToEat = Math.floor(amount / 1000);
        const sausagesEatenToday = parseInt(getProperty('_sausagesEaten'), 10) || 0;
        const sausagesRemainingToday = Math.max(0, 23 - sausagesEatenToday);
        const casings = toItem('magical sausage casing');
        if (sausagesToEat <= sausagesRemainingToday && availableAmount(casings) >= sausagesToEat) {
            if (eat(toItem('magical sausage'), sausagesToEat)) {
                amount -= sausagesToEat * 1000;
            }
        }
    }

    if (!restoreMp(amount)) {
        throw new Error("Could not restore enough MP.");
    }
}

function preflight() {
    const pathName = currentPathName();
    if (!isUnrestrictedPath(pathName)) {
        throw new Error("Delve only supports unrestricted aftercore; " + pathName + " is a restricted path.");
    }

    if (!canAdventure(toLocation(`Fernswarthy's Basement`))) {
        throw new Error('You do not have access to the basement.');
    }

    if (myAdventures() <= 0) {
        throw new Error('You do not have any adventures left.');
    }

    if (!haveSkill(toSkill('Saucegeyser'))) {
        throw new Error('You need Saucegeyser in the Fernswarthy CCS.');
    }

    [...DIVINE_COMBAT_ITEMS, GAS_BALLOON].forEach((item) => {
        if (!isKnown(item)) {
            throw new Error('KoLmafia does not know the required Delve item.');
        }
    });
}

function restoreClosetedItems(items) {
    for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i].item;
        var count = items[i].count;
        if (!takeCloset(count, item)) {
            throw new Error("Could not return " + count + " " + item.name + " from the closet.");
        }
    }
}

function closetNonCombatItems(combatItem) {
    const moved = [];
    try {
        DIVINE_COMBAT_ITEMS.forEach((item) => {
            if (item !== combatItem) {
                const count = itemAmount(item);
                if (count > 0) {
                    if (!putCloset(count, item)) {
                        throw new Error("Could not put " + item.name + " in the closet.");
                    }
                    moved.push({ item, count });
                }
            }
        });
    } catch (error) {
        restoreClosetedItems(moved);
        throw error;
    }
    return moved;
}

/**
 * Load the page for the given basement level
 * @param {Number} [action=1]  option to select
 */
function dive(action) {
    action = action || 1;
    visitUrl("basement.php?action=" + action + "&pwd");
}

function tryMaximize(maximizerString) {
    try {
        cliExecute("maximize " + maximizerString);
    } finally {
        cliExecute("refresh equipment");
        cliExecute("maximize " + maximizerString);
    }
}

/**
 * Execute default source for the given buffs if needed
 * @param {Effect[]} buffs  buffs to execute
 */
function maintainBuffs(buffs) {
    buffs.forEach((buff) => {
        if (!haveEffect(buff) && buff.default !== '') {
            cliExecute("try; " + buff.default);
        }
    });
}

/**
 * Get highest stat using the provided function to get current stat values
 * @param {function} statFunc  function to get value for stat
 * @return {Stat} highest stat
 */
function highestStat(statFunc) {
    var highest = toStat('none');
    var stats = [MOX, MYS, MUS];
    for (var i = 0; i < 3; i++) {
        var stat = stats[i];
        if (statFunc(stat) > statFunc(highest)) {
            highest = stat;
        }
    }

    return highest;
}

/**
 * Get highest base stat
 * @return {Stat} highest base stat
 */
function myHighestStat() {
    return highestStat(myBasestat);
}

/**
 * Get highest boosted stat
 * @return {Stat} highest boosted stat
 */
function myHighestBuffedStat() {
    return highestStat(myBuffedstat);
}

/**
 * Stabilize the given stat to the highest other stat if possible
 * @param {Stat} goal  stat to maximize
 */
function stabilize(goal) {
    const highest = myHighestStat();

    if (myBasestat(highest) > myBasestat(goal)) {
        const effect = toEffect(STABILIZERS[highest]);
        if (haveEffect(effect) < 1) {
            cliExecute(effect.default);
        }
    }
}

/**
 * Get the indefinite article for the given noun
 * @param {string} noun
 * @return {string} indefinite article and given noun
 */
function indefiniteArticle(noun) {
    if (['a', 'e', 'i', 'o', 'u'].includes(noun.charAt(0).toLowerCase())) {
        return "an " + noun;
    }

    return "a " + noun;
}

/**
 * See if given stat is buffed enough for the basement level
 * @param {number} level  basement level
 * @param {Stat} stat  stat to check
 * @return {boolean}
 */
function checkStat(level, stat) {
    return myBuffedstat(stat) >= requiredStat(level);
}

/**
 * Improve the given stat
 * @param {number} required  necessary stat
 * @param {number} step  current attempt number
 * @param {Stat} stat  stat to increase
 * @return {boolean} true if something was done
 */
function improveStat(required, step, stat) {
    switch (step) {
        case 0:
            cliExecute("maximize " + required + " " + stat + " min, switch Left-Hand Man, switch Disembodied Hand");
            return true;
        case 1:
            stabilize(stat);
            return true;
        case 2:
            maintainBuffs(ALL_STAT_BUFFS);
            return true;
        case 3:
            maintainBuffs(STAT_BUFFS[stat]);
            return true;
    }

    return false;
}

/**
 * See if the given monster can be killed
 * @param {number} level  basement level
 * @param {Monster} m  monster
 * @return {boolean} true if monster can be killed
 */
function checkMonster(level, m) {
    return canSurviveMonster({
        attack: Math.max(0, expectedDamage(m)),
        hp: monsterHp(m),
        maxHp: myMaxhp(),
        divineDamage: myBuffedstat(myHighestBuffedStat()),
        physicalResistance: m.physicalResistance || 0,
        jumpChance: jumpChance(m)
    });
}

/**
 * See if have enough MP for the given level
 * @param {number} level  basement level
 * @return {boolean} true if have enough MP
 */
function checkMp(level) {
    return myMaxmp() > requiredMp(level);
}

function improveMp(required, step) {
    switch (step) {
        case 0:
            cliExecute("maximize " + Math.ceil(required + 1) + " mp, switch Left-Hand Man, switch Disembodied Hand");
            return true;
        case 1:
        case 2:
        case 3:
            improveStat(required, step, MYS);
            return true;
        case 4:
            cliExecute("gain " + required + " mp");
            return true;
    }

    return false;
}

function checkHp(level) {
    return myMaxhp() > requiredHp(level, damageAbsorptionPercent());
}

function improveHp(required, step) {
    switch (step) {
        case 0:
            cliExecute("maximize " + Math.ceil(required + 1) + " hp, DA, switch Left-Hand Man, switch Disembodied Hand");
            return true;
        case 1:
            haveSkill(toSkill('Ghostly Shell')) && useSkill(toSkill('Ghostly Shell'));
            return true;
        case 2:
            haveSkill(toSkill('Astral Shell')) && useSkill(toSkill('Astral Shell'));
            return true;
        case 3:
            improveStat(required, step, MUS);
            return true;
        case 4:
            cliExecute("gain " + Math.ceil(required) + " hp");
            return true;
    }

    return false;
}

/**
 * check the given elements
 * @param {number} level  basement level
 * @param {Element} e1  first element
 * @param {Element} e2  second element
 * @param {number} [factor=1]  factor to multiply by
 * @return {boolean} true if resitant enough to survive
 */
function checkElement(level, e1, e2, factor) {
    factor = factor || 1;
    return myMaxhp() > requiredElementFor(level, e1, e2) * factor;
}

function requiredElementFor(level, e1, e2) {
    return requiredElement(
        level,
        elementalResistance(e1),
        elementalResistance(e2)
    );
}

function improveElement(requirement, step, e1, e2) {
    switch (step) {
        case 0:
            tryMaximize(e1 + " res, " + e2 + " res, switch Left-Hand Man, switch Disembodied Hand, switch Mu, switch Exotic Parrot");
            return true;
        case 1:
            maintainBuffs(ALL_RESISTANCE_BUFFS);
            return true;
        case 2:
            maintainBuffs(RESISTANCE_BUFFS[e1]);
            return true;
        case 3:
            maintainBuffs(RESISTANCE_BUFFS[e2]);
            return true;
        case 4:
        case 5:
        case 6:
            improveHp(requirement, step - 3);
            return true;
        case 7:
            cliExecute("gain " + requirement + " hp");
            return true;
    }

    return false;
}

const TESTS = {
    /**
     * Handle stat test for the given level
     * @param {number} level  basement level
     * @param {string} challenge  value from CHALLENGE_MAP
     */
    STAT: function (level, challenge) {
        const stat = toStat(challenge[1]);
        const required = requiredStat(level);
        print("Level " + level + " tests your " + stat, "green");

        for (var i = 0; !checkStat(level, stat); i++) {
            if (!improveStat(required, i, stat)) {
                throw new Error("You need " + Math.ceil(required - myBuffedstat(stat)) + " more " + stat);
            }
        }

        dive();
    },
    /**
     * Handle monster test for the given level
     * @param {number} level  basement level
     * @param {string} challenge  value from CHALLENGE_MAP
     */
    MONSTER: function (level, challenge) {
        const m = toMonster(challenge[1]);
        if (!isKnown(m)) {
            throw new Error("KoLmafia does not know the basement monster " + challenge[1] + ".");
        }

        print("Level " + level + " has you fighting " + indefiniteArticle(m.name), "green");

        let combatItem;
        const attackStat = myHighestBuffedStat();

        switch (attackStat) {
            case MUS:
                combatItem = DIVINE_COMBAT_ITEMS[2];
                break;
            case MYS:
                combatItem = DIVINE_COMBAT_ITEMS[0];
                break;
            case MOX:
                combatItem = DIVINE_COMBAT_ITEMS[1];
                break;
        }

        if (!isKnown(combatItem)) {
            throw new Error("Could not choose a divine combat item.");
        }

        let movedItems = [];
        cliExecute('refresh inventory');
        try {
            movedItems = closetNonCombatItems(combatItem);
            retrieveRequired(10, combatItem);
            retrieveRequired(1, GAS_BALLOON);
            cliExecute("maximize effective, hp, dr, da, " + attackStat);

            if (!(ARGS.ignoreMonsterCheck || checkMonster(level, m))) {
                throw new Error("Won't survive fighting " + m.name + " at level " + level);
            }

            restoreRequiredHp(myMaxhp());
            customRestoreMp(1000);

            dive();
            const combatResult = runCombat();
            if (!combatResult || String(combatResult).trim() === '') {
                throw new Error("Combat with " + m.name + " did not run.");
            }
            if (myHp() <= 0 || haveEffect(toEffect('Beaten Up'))) {
                throw new Error("Combat with " + m.name + " did not end safely.");
            }
        } catch (error) {
            if (movedItems.length > 0) {
                try {
                    restoreClosetedItems(movedItems);
                } catch (restoreError) {
                    throw new Error(error.message + " " + restoreError.message);
                }
            }
            throw error;
        }
    },
    /**
     * Handle MP test for the given level
     * @param {number} level  basement level
     * @param {string} challenge  value from CHALLENGE_MAP
     */
    MP: function (level) {
        print("Level " + level + " tests your MP", "green");

        const required = requiredMp(level);
        for (var i = 0; !checkMp(level); i++) {
            if (!improveMp(required, i)) {
                throw new Error("You need " + Math.ceil(required - myMaxmp()) + " more MP");
            }
        }

        customRestoreMp(required);
        dive();
    },
    /**
     * Handle HP test for the given level
     * @param {number} level  basement level
     */
    HP: function (level) {
        print("Level " + level + " tests your HP", "green");

        const required = requiredHp(level, damageAbsorptionPercent());
        for (var i = 0; !checkHp(level); i++) {
            if (!improveHp(required, i)) {
                throw new Error("You need " + Math.ceil(required - myMaxhp()) + " more HP");
            }
        }

        restoreRequiredHp(required);
        dive();
    },
    /**
     * Handle element test for the given level
     * @param {number} level  basement level
     * @param {string} challenge  value from CHALLENGE_MAP
     */
    ELEMENT: function (level, challenge) {
        const e1 = toElement(challenge[1]);
        const e2 = toElement(challenge[2]);

        print("Level " + level + " tests your " + e1 + " and " + e2 + " resistance", "green");

        for (var i = 0; !checkElement(level, e1, e2, i === 0 ? 2 : 1); i++) {
            const required = requiredElementFor(level, e1, e2);
            if (!improveElement(required, i, e1, e2)) {
                throw new Error("You need " + Math.ceil(required - myMaxhp()) + " more HP (or more " + e1 + " or " + e2 + " resistance)");
            }
        }

        restoreRequiredHp(requiredElementFor(level, e1, e2) + 1);
        dive();
    },
    REWARD: function (level, challenge) {
        print("Level " + level + " gives you a reward", "green");

        if (challenge[1] === '500') {
            print("Got your telescope! Take it manually before running Delve again.", "green");
            return;
        }

        dive();
    },
    BUFF: function (level, challenge) {
        const stat1 = toStat(challenge[1]);
        const stat2 = toStat(challenge[2]);

        print("Level " + level + " gives you a buff of " + stat1 + " or " + stat2, "green");

        dive(myBasestat(stat1) < myBasestat(stat2) ? 1 : 2);
    }
};

/**
 * General handler
 * @returns {number} basement level completed
 */
function handleChallenge() {
    const page = visitUrl('basement.php');
    const level = getLevel(page);
    if (level < 1) {
        throw new Error('Could not determine the current basement level.');
    }

    const challenge = getChallenge(page);
    const parts = challenge.split(',');

    const testName = parts[0].toUpperCase();
    const testFunc = TESTS[testName];
    if (!testFunc) {
        throw new Error('Unrecognised basement challenge type: ' + parts[0]);
    }

    testFunc(level, parts);

    if (myHp() <= 0 || haveEffect(toEffect('Beaten Up'))) {
        throw new Error('Oops. We got beaten up somehow.');
    }

    return level;
}

function main(args) {
    ARGS.ignoreMonsterCheck = Boolean(args && args.includes('noCheck'));
    try {
        preflight();

        if (myLevel() < 30 && !userConfirm("It's suggested to be level 30 before basement diving. Are you sure you want to proceed?")) {
            return;
        }

        while (myAdventures() > 0) {
            if (handleChallenge() >= 500) {
                return;
            }
        }
    } catch (e) {
        print(e.message, "red");
    }
}

module.exports.main = main;
