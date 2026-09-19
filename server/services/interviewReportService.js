function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function average(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
}

const NON_SKILL_TOPICS = new Set(['behavioral', 'closing', 'experience']);

/**
 * Builds the interview report entirely from real, already-computed
 * per-answer data (see interviewQuestionService.analyzeAnswer) — every
 * number here is derived from the candidate's actual transcribed answers,
 * never randomized or invented.
 */
function generateInterviewReport(questions) {
  const answered = questions.filter((q) => q.answerText && q.answerText.trim().length > 0);

  const technicalQuestions = answered.filter((q) => !NON_SKILL_TOPICS.has(q.topic));
  const technicalKnowledge = average(technicalQuestions.map((q) => q.analysis.relevanceScore)) ?? 0;
  const answerRelevance = average(answered.map((q) => q.analysis.relevanceScore)) ?? 0;

  const totalWords = answered.reduce((s, q) => s + q.analysis.wordCount, 0);
  const totalFillers = answered.reduce((s, q) => s + q.analysis.fillerWordCount, 0);
  const fillerRatio = totalWords === 0 ? 0 : totalFillers / totalWords;

  const avgWordCount = average(answered.map((q) => q.analysis.wordCount)) ?? 0;
  // Communication rewards substantive but not rambling answers and penalizes filler-word-heavy speech.
  const lengthScore = clamp((avgWordCount / 60) * 100, 0, 100) * (avgWordCount > 150 ? 0.85 : 1);
  const fillerPenalty = clamp(fillerRatio * 300, 0, 60);
  const communication = clamp(Math.round(lengthScore - fillerPenalty), 0, 100);

  // Confidence/clarity heuristic: low filler-word ratio + consistent,
  // adequately-detailed answers. Explicitly a heuristic, not a claim of
  // measuring actual emotional confidence.
  const wordCounts = answered.map((q) => q.analysis.wordCount);
  const wcAvg = average(wordCounts) ?? 0;
  const variance = wordCounts.length > 0 ? average(wordCounts.map((w) => (w - wcAvg) ** 2)) ?? 0 : 0;
  const consistencyScore = clamp(100 - Math.sqrt(variance) * 2, 0, 100);
  const confidenceClarity = clamp(Math.round(consistencyScore * 0.5 + (100 - fillerPenalty) * 0.5), 0, 100);

  const skillsDemonstrated = Array.from(
    new Set(answered.flatMap((q) => q.analysis.keywordsMatched || []))
  );

  const overallScore = clamp(
    Math.round(technicalKnowledge * 0.35 + communication * 0.25 + answerRelevance * 0.25 + confidenceClarity * 0.15),
    0,
    100
  );

  const strengths = [];
  const weaknesses = [];
  const improvementSuggestions = [];

  const dims = [
    ['Technical knowledge', technicalKnowledge, 'Give more specific, technical detail when discussing your skills and projects.'],
    ['Communication', communication, 'Reduce filler words (um, like, basically) and aim for clear, moderately detailed answers.'],
    ['Answer relevance', answerRelevance, 'Make sure to directly address what was asked before elaborating further.'],
    ['Confidence/clarity', confidenceClarity, 'Practice answering out loud beforehand to build a steadier, more consistent delivery.'],
  ];
  for (const [label, score, suggestion] of dims) {
    if (score >= 75) strengths.push(`${label}: strong (${score}/100)`);
    else if (score < 55) {
      weaknesses.push(`${label}: ${score}/100`);
      improvementSuggestions.push(suggestion);
    }
  }

  if (skillsDemonstrated.length > 0) {
    strengths.push(`Demonstrated working knowledge of: ${skillsDemonstrated.join(', ')}`);
  }

  const unanswered = questions.length - answered.length;
  if (unanswered > 0) {
    weaknesses.push(`${unanswered} question(s) were left unanswered`);
    improvementSuggestions.push('Try to provide at least a brief answer to every question, even under time pressure.');
  }

  return {
    overallScore,
    technicalKnowledge,
    communication,
    answerRelevance,
    confidenceClarity,
    skillsDemonstrated,
    strengths,
    weaknesses,
    improvementSuggestions,
  };
}

module.exports = { generateInterviewReport };
