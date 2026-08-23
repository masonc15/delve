const assert = require("node:assert/strict");
const test = require("node:test");

const {
    CHALLENGE_MAP,
    getLevel,
    getChallenge,
    isUnrestrictedPath,
    requiredStat,
    requiredMp,
    requiredHp,
    requiredElement,
    canSurviveMonster
} = require("../scripts/delve-helpers");

test("recognizes every known basement challenge image", () => {
    for (const [image, challenge] of Object.entries(CHALLENGE_MAP)) {
        const page = `<img src="/images/basement/${image}.gif?v=1">`;
        assert.equal(getChallenge(page), challenge, image);
    }
});

test("recognizes challenge images without a path or with mixed case", () => {
    assert.equal(getChallenge("BEERGOLEM.GIF"), "monster,X Bottles of Beer on a Golem");
});

test("recognizes the floor-300 reward as lepbell or lepbell2", () => {
    assert.equal(getChallenge("lepbell.gif"), "reward,300");
    assert.equal(getChallenge("<img src=\"/images/basement/lepbell2.gif\">"), "reward,300");
});

test("rejects malformed challenge pages", () => {
    assert.throws(() => getChallenge("<html>not a basement page</html>"), /Unrecognised challenge/);
    assert.equal(getLevel("<html>not a basement page</html>"), 0);
});

test("parses basement levels", () => {
    assert.equal(getLevel("Fernswarthy's Basement, Level 42"), 42);
    assert.equal(getLevel("Fernswarthy’s Basement, Level 500"), 500);
});

test("only allows unrestricted aftercore paths", () => {
    assert.equal(isUnrestrictedPath("none"), true);
    assert.equal(isUnrestrictedPath("None"), true);
    assert.equal(isUnrestrictedPath("Thrifty"), false);
});

test("preserves the basement requirement formulas", () => {
    assert.equal(requiredStat(0), 2.1);
    assert.equal(requiredMp(0), 0);
    assert.equal(requiredHp(10, 0), Math.pow(10, 1.415) * 10);
    assert.equal(requiredElement(10, 0, 0), Math.ceil((4.48 * Math.pow(10, 1.4) + 8) * 2 * 1.05));
});

test("uses conservative monster round boundaries", () => {
    const setup = {
        attack: 100,
        hp: 100,
        maxHp: 100,
        divineDamage: 100
    };

    assert.equal(canSurviveMonster(setup), true);
    assert.equal(canSurviveMonster({ ...setup, hp: 101 }), false);
    assert.equal(canSurviveMonster({ ...setup, attack: 0, hp: 1000 }), true);
    assert.equal(canSurviveMonster({ ...setup, jumpChance: 100, hp: 1000 }), true);
});

test("counts guaranteed stun rounds before monster attacks", () => {
    const level493Setup = {
        attack: 1825,
        hp: 10021,
        maxHp: 6046,
        divineDamage: 2159
    };

    assert.equal(canSurviveMonster(level493Setup), false);
    assert.equal(canSurviveMonster({ ...level493Setup, stunRounds: 2 }), true);
});
