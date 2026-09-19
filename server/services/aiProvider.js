const { aiProvider, aiApiKey } = require('../config/env');

/**
 * Thin abstraction over an external LLM provider for candidate summaries.
 * No provider is wired up by default — set AI_PROVIDER/AI_API_KEY in .env
 * and implement the branch below to enable it. The API key never leaves
 * the backend. Callers must treat a null return as "fall back to the
 * deterministic rule-based summary" (see candidateSummaryService.js) and
 * must never fail the request just because AI generation isn't configured.
 */
async function isAvailable() {
  return Boolean(aiProvider && aiApiKey);
}

// eslint-disable-next-line no-unused-vars
async function generateSummary(prompt) {
  if (!(await isAvailable())) return null;
  // Intentionally unimplemented: no AI provider is configured for this
  // deployment. Wire up a real HTTP call to `aiProvider` here if/when one
  // is added — keep the response strictly grounded in `prompt`'s data.
  return null;
}

module.exports = { isAvailable, generateSummary };
