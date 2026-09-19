const { SKILL_ALIASES } = require('./skillDictionary');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds one case-insensitive regex per alias. Aliases that are plain
 * words get \b word boundaries; aliases containing symbols (c++, c#,
 * node.js) match as literal substrings with loose boundaries instead,
 * since \b doesn't work around non-word characters.
 */
function buildMatcher(alias) {
  const hasSymbols = /[^a-z0-9\s]/i.test(alias.trim());
  const escaped = escapeRegex(alias.trim());
  if (hasSymbols) {
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  }
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

/**
 * Scans resume text for known technical skills and returns the
 * normalized (canonical) skill names found, e.g. "reactjs" -> "React".
 */
function extractSkills(text) {
  if (!text) return [];
  const found = new Set();

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const alias of aliases) {
      if (buildMatcher(alias).test(text)) {
        found.add(canonical);
        break;
      }
    }
  }

  return Array.from(found).sort();
}

module.exports = { extractSkills };
