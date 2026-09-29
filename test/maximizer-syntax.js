// KoLmafia reads a maximizer expression as "[weight] keyword" terms, and a
// "min" or "max" term takes the number before it as its limit (see
// MaximizerExpression.KEYWORD_PATTERN). Putting the limit before the modifier,
// as in "300 muscle min", makes "muscle min" one unknown keyword.
const KEYWORD_PATTERN = /\s*(\+|-|)([\d.]*)\s*("[^"]+"|(?:[^-+,0-9]|(?<! )[-+0-9])+),?\s*/y;

function maximizerTerms(expression) {
    const terms = [];
    const text = expression.trim().toLowerCase();
    KEYWORD_PATTERN.lastIndex = 0;
    while (KEYWORD_PATTERN.lastIndex < text.length) {
        const match = KEYWORD_PATTERN.exec(text);
        if (!match) {
            throw new Error("Unable to interpret maximizer expression: " + expression);
        }
        terms.push({ weight: match[2], keyword: match[3].trim() });
    }
    return terms;
}

function assertValidMaximizer(command) {
    const expression = command.replace(/^maximize\s+/, "");
    for (const term of maximizerTerms(expression)) {
        if (/\s(min|max)$/.test(term.keyword)) {
            throw new Error("Unrecognized maximizer keyword \"" + term.keyword + "\" in: " + command);
        }
    }
}

module.exports = { assertValidMaximizer };
