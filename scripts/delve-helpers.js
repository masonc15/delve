const SAFETY_MARGIN = 1.05;

// Challenge types
const BUFF = "buff";
const MONSTER = "monster";
const STAT = "stat";
const ELEMENT = "element";
const HP = "hp";
const MP = "mp";
const REWARD = "reward";

const CHALLENGE_MAP = {
    "twopills": BUFF + ",muscle,mysticality",
    "figurecard": BUFF + ",mysticality,moxie",
    "twojackets": BUFF + ",moxie,muscle",
    "hydra": MONSTER + ",X-headed Hydra",
    "stonegolem": MONSTER + ",X Stone Golem",
    "eyebeast": MONSTER + ",Beast with X Eyes",
    "earbeast": MONSTER + ",Beast with X Ears",
    "beergolem": MONSTER + ",X Bottles of Beer on a Golem",
    "fernghost": MONSTER + ",Ghost of Fernswarthy's Grandfather",
    "dimhorror": MONSTER + ",X-dimensional horror",
    "bigstatue": STAT + ",muscle",
    "typewriters": STAT + ",muscle",
    "bigmallet": STAT + ",muscle",
    "darkshards": STAT + ",mysticality",
    "voodoo": STAT + ",mysticality",
    "mops": STAT + ",mysticality",
    "pooltable": STAT + ",moxie",
    "sorority": STAT + ",moxie",
    "bigbaby": STAT + ",moxie",
    "goblinaxe": STAT + ",moxie",
    "snowballbat": ELEMENT + ",spooky,cold",
    "onnastick": ELEMENT + ",stench,hot",
    "document": ELEMENT + ",hot,spooky",
    "coldmarg": ELEMENT + ",cold,sleaze",
    "fratbong": ELEMENT + ",sleaze,stench",
    "powderbox": MP,
    "haiku11": HP,
    "angel": REWARD + ",100",
    "duskdoor": REWARD + ",200",
    "lepbell": REWARD + ",300",
    "corpse": REWARD + ",400",
    "chest": REWARD + ",500"
};

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get basement level from page html.
 * @param {string} page page html
 * @return {number} level, or 0 when the page is not a basement page
 */
function getLevel(page) {
    if (typeof page !== "string") {
        return 0;
    }

    const match = page.match(/Fernswarthy['’]s\s+Basement,\s+Level\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Determine the current basement challenge using its image.
 * @param {string} page page html
 * @return {string} value from CHALLENGE_MAP
 */
function getChallenge(page) {
    if (typeof page !== "string") {
        throw new Error("Unrecognised challenge");
    }

    var images = Object.keys(CHALLENGE_MAP);
    for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var imagePattern = new RegExp(
            "(?:^|[^a-z0-9])" + escapeRegExp(image) + "\\.gif(?:[^a-z0-9]|$)",
            "i"
        );
        if (imagePattern.test(page)) {
            return CHALLENGE_MAP[image];
        }
    }

    throw new Error("Unrecognised challenge");
}

function isUnrestrictedPath(pathName) {
    return !pathName || String(pathName).toLowerCase() === "none";
}

function requiredStat(level) {
    return (Math.pow(level, 1.4) + 2) * SAFETY_MARGIN;
}

function requiredMp(level) {
    return 1.67 * Math.pow(level, 1.4) * SAFETY_MARGIN;
}

function requiredHp(level, damageAbsorptionPercent) {
    return Math.pow(level, 1.415) * 10 * (100 - damageAbsorptionPercent) / 100;
}

function requiredElement(level, e1Resistance, e2Resistance) {
    const damage = (4.48 * Math.pow(level, 1.4)) + 8;
    const e1Damage = damage * ((100 - e1Resistance) / 100);
    const e2Damage = damage * ((100 - e2Resistance) / 100);
    return Math.ceil((e1Damage + e2Damage) * SAFETY_MARGIN);
}

/**
 * Check whether the current combat setup is conservative enough.
 * A monster that always jumps or cannot deal damage is safe to attempt.
 */
function canSurviveMonster(setup) {
    const attack = setup.attack;
    const hp = setup.hp;
    const maxHp = setup.maxHp;
    const divineDamage = setup.divineDamage;
    const physicalResistance = setup.physicalResistance || 0;
    const jumpChance = setup.jumpChance || 0;

    if (physicalResistance >= 100 || jumpChance >= 100 || attack <= 0) {
        return true;
    }

    const actualDamage = Math.max(
        1,
        divineDamage - Math.floor(divineDamage * physicalResistance / 100)
    );
    const survivableRounds = Math.floor(maxHp / attack);
    const roundsToKill = Math.ceil(hp / actualDamage);

    return survivableRounds >= roundsToKill;
}

module.exports = {
    CHALLENGE_MAP,
    getLevel,
    getChallenge,
    isUnrestrictedPath,
    requiredStat,
    requiredMp,
    requiredHp,
    requiredElement,
    canSurviveMonster
};
