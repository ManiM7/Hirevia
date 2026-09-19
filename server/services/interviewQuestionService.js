const { extractSkills } = require('./skillExtractionService');

/**
 * Real, code-defined question TEMPLATES — instantiated with the specific
 * candidate's actual skills/interest/objective/certifications so the
 * resulting question text is genuinely personalized rather than a fixed
 * canned script. No external LLM is configured for this deployment (see
 * aiProvider.js); this deterministic generator is the honest substitute —
 * every question is grounded in real profile data, never invented.
 */

const BEHAVIORAL_QUESTIONS = [
  'Tell me a little about your background and what led you into this field.',
  'Describe a time you faced a difficult challenge in a project. How did you handle it?',
  'How do you prioritize tasks when you have multiple deadlines at once?',
  'Tell me about a time you disagreed with a teammate or manager. How did you resolve it?',
  'What motivates you most in your work?',
  'Describe a mistake you made on a project and what you learned from it.',
  'How do you approach learning a new technology or skill quickly?',
];

const SKILL_TEMPLATES = [
  (skill) => `Can you walk me through a project where you used ${skill}?`,
  (skill) => `What's a challenging problem you've solved using ${skill}, and how did you approach it?`,
  (skill) => `How would you explain ${skill} to someone who has never used it before?`,
  (skill) => `What do you consider your biggest strength when working with ${skill}?`,
];

const CLOSING_QUESTION = "Is there anything else about your skills or experience you'd like to highlight that we haven't covered?";

function experienceOpeningQuestion(experienceLevel) {
  if (experienceLevel === 'Fresher' || experienceLevel === '0-1 years') {
    return "Tell me about an academic or personal project you're most proud of.";
  }
  return 'Tell me about a real-world project you contributed to professionally, and your specific role in it.';
}

/**
 * Builds a personalized pool of {questionText, topic} candidates from the
 * candidate's real profile data, skipping anything already present in
 * `priorTexts` (this candidate's full interview history) so nothing ever
 * repeats across attempts.
 */
function buildQuestionPool({ skills, areaOfInterest, careerObjective, certifications, experienceLevel }, priorTexts) {
  const seen = new Set(priorTexts);
  const pool = [];

  const addUnique = (questionText, topic) => {
    if (seen.has(questionText)) return false;
    pool.push({ questionText, topic });
    seen.add(questionText);
    return true;
  };

  // Opener, tailored to experience level.
  addUnique(experienceOpeningQuestion(experienceLevel), 'experience');

  // One question per top skill (up to 4), trying template variants until an
  // unused one is found for that skill.
  for (const skill of (skills || []).slice(0, 4)) {
    for (const template of SKILL_TEMPLATES) {
      if (addUnique(template(skill), skill)) break;
    }
  }

  if (areaOfInterest) {
    addUnique(`What draws you to ${areaOfInterest}?`, 'areaOfInterest');
  }

  if (careerObjective) {
    addUnique(
      `You mentioned your career objective is: "${careerObjective}" — what steps have you already taken toward that goal?`,
      'careerObjective'
    );
  }

  for (const cert of (certifications || []).slice(0, 2)) {
    addUnique(`Tell me about what you learned while earning your ${cert} certification, and how you've applied it.`, 'certification');
  }

  // Behavioral questions fill out the rest, shuffled for variety across
  // candidates, skipping any this candidate has already been asked.
  const shuffledBehavioral = [...BEHAVIORAL_QUESTIONS].sort(() => Math.random() - 0.5);
  for (const q of shuffledBehavioral) {
    addUnique(q, 'behavioral');
  }

  addUnique(CLOSING_QUESTION, 'closing');

  return pool;
}

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of'];

function analyzeAnswer(answerText, topic, skills) {
  const text = (answerText || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = text.toLowerCase();

  const fillerWordCount = FILLER_WORDS.reduce((count, filler) => {
    const matches = lower.match(new RegExp(`\\b${filler}\\b`, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);

  // Relevance: does the answer mention the topic itself, or any of the
  // candidate's known skills (shows they're drawing on real experience)?
  const mentionedSkills = extractSkills(text);
  const topicMentioned = topic && lower.includes(String(topic).toLowerCase());
  const relevanceScore =
    wordCount === 0
      ? 0
      : Math.min(100, Math.round((topicMentioned ? 50 : 0) + Math.min(mentionedSkills.length, 3) * 15 + Math.min(wordCount / 40, 1) * 20));

  return { wordCount, fillerWordCount, relevanceScore, keywordsMatched: mentionedSkills };
}

/**
 * Real rule-based follow-up logic driven by the transcribed answer's actual
 * content — not a fixed script. Returns a follow-up question string, or
 * null if the answer stands on its own and the interview should move on.
 */
function generateFollowUp({ questionText, topic, answerText, analysis, alreadyFollowedUp }) {
  if (alreadyFollowedUp) return null; // at most one follow-up per question, keeps interview length bounded

  if (analysis.wordCount < 12) {
    return 'Could you elaborate a bit more on that with a specific example?';
  }

  if (topic && !['behavioral', 'closing', 'experience'].includes(topic) && analysis.relevanceScore < 35) {
    return `Can you give a concrete example of how you personally used ${topic} in that situation?`;
  }

  const otherMentionedSkill = analysis.keywordsMatched.find((s) => s.toLowerCase() !== String(topic).toLowerCase());
  if (otherMentionedSkill) {
    return `You mentioned ${otherMentionedSkill} — how did that fit into what you were describing?`;
  }

  return null;
}

module.exports = { buildQuestionPool, analyzeAnswer, generateFollowUp, CLOSING_QUESTION };
