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
    throwItem,
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
    useSkill,
    myInebriety,
    inebrietyLimit,
    currentRound,
    monsterInitiative,
    myPrimestat,
    myMeat
} = require('kolmafia');

const {
    getLevel,
    getChallenge,
    isUnrestrictedPath,
    requiredStat,
    requiredMp,
    requiredHp,
    requiredElement,
    canSurviveMonster,
    requiredDivineDamage,
    requiredMaxHp
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
const SAUCEGEYSER = toSkill('Saucegeyser');
const MAX_MP_DRINK = toItem('mulled hobo wine');
const MAX_MP_DRINK_EFFECT = toEffect("Burnt 'n' Turnt");

function isKnown(value) {
    return value && value.name && value.name.toLowerCase() !== 'none';
}

function isUsableEffect(buff) {
    return isKnown(buff) && typeof buff.default === 'string' && buff.default !== '';
}

function usableEffects(names) {
    var buffs = [];
    for (var i = 0; i < names.length; i++) {
        var buff = toEffect(names[i]);
        if (isUsableEffect(buff)) {
            buffs.push(buff);
        }
    }
    return buffs;
}

const ALL_STAT_BUFFS = usableEffects([
    'Gr8ness',
    'Trivia Master',
    'Tomato Power',
    'Big',
    'Go Get \'Em, Tiger!'
]);

const STAT_BUFFS = {
    Muscle: usableEffects([
        'Phorcefullness',
        'Quiet Determination',
        'Incredibly Hulking',
        'Ham-Fisted'
    ]),
    Mysticality: usableEffects([
        'On the Shoulders of Giants',
        'Mystically Oiled',
        'Quiet Judgement',
        'Glittering Eyelashes'
    ]),
    Moxie: usableEffects([
        'Cock of the Walk',
        'Superhuman Sarcasm',
        'Quiet Desperation',
        'Butt-Rock Hair'
    ])
};

const STABILIZERS = {
    Muscle: 'Stabilizing Oiliness',
    Mysticality: 'Expert Oiliness',
    Moxie: 'Slippery Oiliness'
};

const RESISTANCE_BUFFS = {};
RESISTANCE_BUFFS[toElement('cold')] = usableEffects(['Burning Hands']);
RESISTANCE_BUFFS[toElement('hot')] = usableEffects(['Fireproof Lips']);
RESISTANCE_BUFFS[toElement('sleaze')] = usableEffects(['Proprie Tea']);
RESISTANCE_BUFFS[toElement('spooky')] = usableEffects(['Pleasant Forecast']);
RESISTANCE_BUFFS[toElement('stench')] = usableEffects(['Net tea']);

const ALL_RESISTANCE_BUFFS = usableEffects([
    'Patent Prevention',
    'Oiled-Up',
    'Protection from Bad Stuff'
]);

const ARGS = {
    ignoreMonsterCheck: false
};

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
    var targetMp = Math.min(amount, myMaxmp());
    if (myMp() >= targetMp) {
        return;
    }

    // Sausages cover whole thousands of the shortfall. The target stays an
    // absolute MP level, so restoreMp below tops up whatever they leave.
    var missingMp = targetMp - myMp();
    if (missingMp >= 1000) {
        var sausagesToEat = Math.floor(missingMp / 1000);
        var sausagesEatenToday = parseInt(getProperty('_sausagesEaten'), 10) || 0;
        var sausagesRemainingToday = Math.max(0, 23 - sausagesEatenToday);
        var casings = toItem('magical sausage casing');
        if (sausagesToEat <= sausagesRemainingToday && availableAmount(casings) >= sausagesToEat) {
            eat(toItem('magical sausage'), sausagesToEat);
        }
    }

    if (myMp() >= targetMp) {
        return;
    }

    if (!restoreMp(targetMp) && myMp() < targetMp) {
        throw new Error("Could not restore enough MP.");
    }
}

function preflight() {
    const pathName = currentPathName();
    if (!isUnrestrictedPath(pathName)) {
        throw new Error("Delve only supports unrestricted aftercore; " + pathName + " is a restricted path.");
    }

    if (myInebriety() > inebrietyLimit()) {
        throw new Error("You are overdrunk (" + myInebriety() + "/" + inebrietyLimit() + ") and cannot adventure in the basement.");
    }

    if (!canAdventure(toLocation(`Fernswarthy's Basement`))) {
        throw new Error('You do not have access to the basement.');
    }

    if (myAdventures() <= 0) {
        throw new Error('You do not have any adventures left.');
    }

    if (currentRound() > 0) {
        throw new Error('Already in combat. Finish or abort the current fight before running Delve.');
    }

    if (!haveSkill(toSkill('Saucegeyser'))) {
        throw new Error('You need Saucegeyser for the Fernswarthy ghost fight.');
    }

    if (haveEffect(toEffect('Beaten Up')) > 0) {
        cliExecute("uneffect Beaten Up");
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
    const initialLevel = getLevel(visitUrl("basement.php"));
    const initialAdvs = myAdventures();

    visitUrl("basement.php?action=" + action + "&pwd");

    // Action pages that start a fight leave you on fight.php. Reloading
    // basement.php in that state re-parses the same round and desyncs
    // KoLmafia's round counter from KoL's.
    if (currentRound() > 0) {
        return;
    }

    const newPage = visitUrl("basement.php");
    const newLevel = getLevel(newPage);

    if (newLevel > 0 && newLevel === initialLevel && myAdventures() === initialAdvs) {
        if (myInebriety() > inebrietyLimit()) {
            throw new Error("Diving failed because you are overdrunk (" + myInebriety() + "/" + inebrietyLimit() + ").");
        }
        if (myAdventures() <= 0) {
            throw new Error("Diving failed because you ran out of adventures.");
        }
        throw new Error("Basement did not advance from Level " + initialLevel + ". Aborting loop.");
    }
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
        if (!isUsableEffect(buff) || haveEffect(buff)) {
            return;
        }
        cliExecute("try; " + buff.default);
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
        if (isUsableEffect(effect) && haveEffect(effect) < 1) {
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
 * Equip the best gear for a stat. KoLmafia reads each maximizer term as
 * "[weight] keyword", so a target number must not precede the stat name.
 * @param {Stat} stat  stat to maximize
 */
function maximizeStat(stat) {
    cliExecute("maximize " + stat + ", switch Left-Hand Man, switch Disembodied Hand");
}

function modifierValue(modifier) {
    if (modifier === "hp") return myMaxhp();
    if (modifier === "mp") return myMaxmp();
    return myBuffedstat(toStat(modifier));
}

/**
 * Buy potions with Gain until a modifier reaches the target. Each call spends
 * at most 100k meat, so a deep floor may need several. Gain's own output goes
 * through print_html, which the session log never records, so log each call's
 * target and result here.
 * @param {number} target  buffed value to reach
 * @param {string} modifier  Gain modifier name
 */
function gainModifier(target, modifier) {
    const goal = Math.ceil(target);
    const before = Math.floor(modifierValue(modifier));
    const meatBefore = myMeat();
    const command = "gain " + goal + " " + modifier + " 1 turns";
    print("Gain: " + modifier + " " + before + " -> " + goal + " (" + command + ")", "blue");
    const ok = cliExecute(command);
    const after = Math.floor(modifierValue(modifier));
    const shortBy = goal - after;
    print(
        "Gain: " + modifier + " now " + after
            + (shortBy > 0 ? ", still " + shortBy + " short" : ", target reached")
            + ", spent " + (meatBefore - myMeat()) + " meat"
            + (ok ? "" : ", command failed"),
        shortBy > 0 ? "orange" : "blue"
    );
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
            maximizeStat(stat);
            return true;
        case 1:
            stabilize(stat);
            maximizeStat(stat);
            return true;
        case 2:
            maintainBuffs(ALL_STAT_BUFFS);
            maximizeStat(stat);
            return true;
        case 3:
            maintainBuffs(STAT_BUFFS[stat]);
            maximizeStat(stat);
            return true;
        case 4:
        case 5:
        case 6:
            gainModifier(required, String(stat).toLowerCase());
            return true;
    }

    return false;
}

/**
 * Run one basement fight with one legal action per server round.
 * @param {Monster} monster  basement monster
 * @param {Item} combatItem  divine item for the highest buffed stat
 */
function runBasementCombat(monster, combatItem) {
    if (!isKnown(monster) || !isKnown(combatItem)) {
        throw new Error("Could not prepare basement combat.");
    }

    dive();
    var balloonUsed = false;
    var actions = 0;
    while (currentRound() > 0) {
        actions++;
        if (actions > 20) {
            throw new Error("Combat with " + monster.name + " exceeded 20 actions.");
        }

        if (!balloonUsed && itemAmount(GAS_BALLOON) > 0) {
            balloonUsed = true;
            throwItem(GAS_BALLOON);
            continue;
        }

        if ((monster.physicalResistance || 0) >= 100) {
            visitUrl("fight.php?action=skill&whichskill=" + SAUCEGEYSER.id);
            continue;
        }

        if (itemAmount(combatItem) <= 0) {
            throw new Error("Ran out of " + combatItem.name + " during combat.");
        }
        throwItem(combatItem);
    }
}

function monsterSetup(m, attackStat) {
    return {
        attack: Math.max(0, expectedDamage(m)),
        hp: monsterHp(m),
        maxHp: myMaxhp(),
        // Score the stat that picked the divine item. Maximizing can change
        // which stat is highest after the item was chosen.
        divineDamage: myBuffedstat(attackStat),
        physicalResistance: m.physicalResistance || 0,
        jumpChance: jumpChance(m),
        // A gas balloon prevents retaliation during at least the next two
        // divine-item actions. Live combat can stun for longer.
        stunRounds: 2,
        // Monsters with 10000 initiative, like the Beast with X Eyes, always
        // hit once before the first action.
        ambushHits: monsterInitiative(m) >= 10000 ? 1 : 0
    };
}

function checkMonster(m, attackStat) {
    return canSurviveMonster(monsterSetup(m, attackStat));
}

/**
 * Raise divine-item damage (the attack stat) or max HP until the fight is safe.
 * @param {Monster} m  basement monster
 * @param {Stat} attackStat  stat behind the chosen divine item
 * @param {number} step  current attempt number
 * @return {boolean} true if something was done
 */
function improveMonsterOdds(m, attackStat, step) {
    switch (step) {
        case 0:
            stabilize(attackStat);
            return true;
        case 1:
            maintainBuffs(ALL_STAT_BUFFS);
            return true;
        case 2:
            maintainBuffs(STAT_BUFFS[attackStat]);
            return true;
        case 3:
        case 4:
        case 5:
            var damage = requiredDivineDamage(monsterSetup(m, attackStat));
            if (isFinite(damage)) {
                gainModifier(damage, String(attackStat).toLowerCase());
            }
            return true;
        case 6:
        case 7:
        case 8:
            gainModifier(requiredMaxHp(monsterSetup(m, attackStat)), "hp");
            return true;
    }

    return false;
}

/**
 * See if have enough MP for the given level
 * @param {number} level  basement level
 * @return {boolean} true if have enough MP
 */
function checkMp(level) {
    return myMaxmp() > requiredMp(level);
}

/**
 * Gain undervalues Mysticality percent buffs when asked for max MP, so ask it
 * for the Mysticality that covers the missing MP instead. Mysticality classes
 * get 1.5 MP per point before MP percent bonuses, so this errs toward buying
 * a little extra.
 * @param {number} targetMp  max MP to reach
 */
function gainMysticalityForMp(targetMp) {
    const missingMp = targetMp - myMaxmp();
    if (missingMp <= 0) {
        return;
    }
    const mpPerPoint = myPrimestat() === MYS ? 1.5 : 1;
    gainModifier(myBuffedstat(MYS) + missingMp / mpPerPoint, "mysticality");
}

function improveMp(required, step) {
    switch (step) {
        case 0:
            cliExecute("maximize mp, switch Left-Hand Man, switch Disembodied Hand");
            return true;
        case 1:
            // Max MP follows Mysticality. Buff it without re-maximizing,
            // which would swap out the MP gear from step 0.
            stabilize(MYS);
            maintainBuffs(ALL_STAT_BUFFS);
            return true;
        case 2:
            maintainBuffs(STAT_BUFFS[MYS]);
            return true;
        case 3:
            gainModifier(required + 1, "mp");
            return true;
        case 4:
        case 5:
        case 6:
            gainMysticalityForMp(required + 1);
            return true;
        case 7:
            if (myInebriety() >= inebrietyLimit() || haveEffect(MAX_MP_DRINK_EFFECT) > 0) {
                return false;
            }
            retrieveRequired(1, MAX_MP_DRINK);
            cliExecute("drinksilent 1 " + MAX_MP_DRINK.name);
            if (haveEffect(MAX_MP_DRINK_EFFECT) < 1) {
                throw new Error("Could not drink " + MAX_MP_DRINK.name + ".");
            }
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
            // Each point of DA below 1000 cuts the Gauntlet's damage by more
            // than a point of HP adds, so weight DA well above HP.
            cliExecute("maximize hp, 10 DA 1000 max, switch Left-Hand Man, switch Disembodied Hand");
            return true;
        case 1:
            haveSkill(toSkill('Ghostly Shell')) && useSkill(toSkill('Ghostly Shell'));
            return true;
        case 2:
            haveSkill(toSkill('Astral Shell')) && useSkill(toSkill('Astral Shell'));
            return true;
        case 3:
            // Max HP follows Muscle. Equalize it to the highest stat and buff
            // it, without changing gear chosen for this test.
            stabilize(MUS);
            maintainBuffs(ALL_STAT_BUFFS);
            maintainBuffs(STAT_BUFFS[MUS]);
            return true;
        case 4:
        case 5:
        case 6:
            gainModifier(required + 1, "hp");
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
        case 8:
        case 9:
            gainModifier(requirement + 1, "hp");
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
        var combatError = null;
        cliExecute('refresh inventory');
        try {
            movedItems = closetNonCombatItems(combatItem);
            retrieveRequired(10, combatItem);
            retrieveRequired(1, GAS_BALLOON);
            cliExecute("maximize effective, hp, dr, da, " + attackStat);

            for (var step = 0; !(ARGS.ignoreMonsterCheck || checkMonster(m, attackStat)); step++) {
                if (!improveMonsterOdds(m, attackStat, step)) {
                    throw new Error("Won't survive fighting " + m.name + " at level " + level);
                }
            }

            restoreRequiredHp(myMaxhp());
            customRestoreMp(1000);

            runBasementCombat(m, combatItem);
            if (currentRound() > 0) {
                throw new Error("Combat with " + m.name + " did not complete.");
            }
            if (myHp() <= 0 || haveEffect(toEffect('Beaten Up'))) {
                throw new Error("Combat with " + m.name + " did not end safely.");
            }
        } catch (error) {
            combatError = error;
            throw error;
        } finally {
            if (movedItems.length > 0) {
                try {
                    restoreClosetedItems(movedItems);
                } catch (restoreError) {
                    if (combatError) {
                        throw new Error(combatError.message + " " + restoreError.message);
                    }
                    throw restoreError;
                }
            }
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

        // DA changes as gear and buffs change, so recompute the damage each try.
        for (var i = 0; !checkHp(level); i++) {
            const required = requiredHp(level, damageAbsorptionPercent());
            if (!improveHp(required, i)) {
                throw new Error("You need " + Math.ceil(required - myMaxhp()) + " more HP");
            }
        }

        restoreRequiredHp(Math.ceil(requiredHp(level, damageAbsorptionPercent())) + 1);
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

        var previousLevel = 0;
        var loopCountOnSameLevel = 0;

        while (myAdventures() > 0 && myInebriety() <= inebrietyLimit()) {
            var currentFloor = handleChallenge();
            if (currentFloor >= 500) {
                return;
            }
            if (currentFloor === 499) {
                print("Stopped after floor 499. Open the Basement to view the level 500 reward.", "green");
                return;
            }

            if (currentFloor === previousLevel) {
                loopCountOnSameLevel++;
                if (loopCountOnSameLevel >= 3) {
                    throw new Error("Stuck on Basement Level " + currentFloor + ". Halting to prevent infinite loop.");
                }
            } else {
                previousLevel = currentFloor;
                loopCountOnSameLevel = 0;
            }
        }
    } catch (e) {
        print(e.message, "red");
    }
}

module.exports.main = main;
