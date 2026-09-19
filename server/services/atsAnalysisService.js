const { extractSkills } = require('./skillExtractionService');

// Configurable scoring weights — sums to 100. Can be tuned without
// touching the scoring logic itself.
const WEIGHTS = {
  contact: 10,
  summary: 10,
  skills: 20,
  experience: 20,
  projects: 15,
  education: 10,
  certifications: 5,
  keywords: 10,
};

const ACTION_VERBS = [
  'developed', 'designed', 'built', 'implemented', 'led', 'managed', 'architected',
  'optimized', 'automated', 'deployed', 'improved', 'reduced', 'increased', 'launched',
  'migrated', 'integrated', 'scaled', 'mentored', 'delivered', 'engineered',
];

const QUANTIFIER_REGEX = /(\d+(\.\d+)?\s?%|\$\s?\d+|\b\d+x\b|\b\d{2,}\+?\s?(users|requests|records|ms|customers|clients|transactions))/i;

// Skills that commonly appear together on real resumes. If a candidate has
// at least one skill from a cluster, the other cluster skills they're
// missing are surfaced as concrete, role-relevant recommendations instead
// of a generic "add more skills" message.
const SKILL_CLUSTERS = [
  ['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'MySQL', 'REST APIs'],
  ['React', 'Redux', 'TypeScript', 'HTML', 'CSS', 'Next.js'],
  ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Jenkins', 'Terraform'],
  ['Python', 'Pandas', 'NumPy', 'Machine Learning', 'SQL'],
  ['Java', 'Spring Boot', 'SQL', 'MySQL', 'PostgreSQL'],
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreContact(parsed) {
  let score = 0;
  if (parsed.name) score += WEIGHTS.contact * 0.3;
  if (parsed.email) score += WEIGHTS.contact * 0.4;
  if (parsed.phone) score += WEIGHTS.contact * 0.3;
  return Math.round(score);
}

function scoreSummary(parsed) {
  const len = parsed.summary?.trim().length || 0;
  if (len === 0) return 0;
  if (len < 40) return Math.round(WEIGHTS.summary * 0.4);
  return WEIGHTS.summary;
}

function scoreSkills(skills) {
  if (skills.length === 0) return 0;
  const ratio = clamp(skills.length / 8, 0, 1);
  return Math.round(ratio * WEIGHTS.skills);
}

function scoreExperience(parsed) {
  const entries = parsed.experience || [];
  if (entries.length === 0) return 0;
  const base = clamp(entries.length / 6, 0, 1) * (WEIGHTS.experience * 0.6);
  const quantified = entries.filter((e) => QUANTIFIER_REGEX.test(e)).length;
  const impactBonus = clamp(quantified / 3, 0, 1) * (WEIGHTS.experience * 0.4);
  return Math.round(base + impactBonus);
}

function scoreProjects(parsed) {
  const entries = parsed.projects || [];
  if (entries.length === 0) return 0;
  const base = clamp(entries.length / 4, 0, 1) * (WEIGHTS.projects * 0.7);
  const withTech = entries.filter((e) => /\b(using|with|via)\b/i.test(e) || /[A-Z][a-zA-Z0-9.]+/.test(e)).length;
  const techBonus = clamp(withTech / entries.length, 0, 1) * (WEIGHTS.projects * 0.3);
  return Math.round(base + techBonus);
}

function scoreEducation(parsed) {
  const entries = parsed.education || [];
  if (entries.length === 0) return 0;
  return WEIGHTS.education;
}

function scoreCertifications(parsed) {
  const entries = parsed.certifications || [];
  if (entries.length === 0) return 0;
  const ratio = clamp(entries.length / 2, 0, 1);
  return Math.round(ratio * WEIGHTS.certifications);
}

function scoreKeywords(parsed) {
  const haystack = [...(parsed.experience || []), ...(parsed.projects || [])].join(' ').toLowerCase();
  if (!haystack) return 0;
  const hits = ACTION_VERBS.filter((v) => haystack.includes(v)).length;
  const ratio = clamp(hits / 6, 0, 1);
  return Math.round(ratio * WEIGHTS.keywords);
}

function findMissingKeywords(skills) {
  const skillSet = new Set(skills);
  const missing = new Set();
  for (const cluster of SKILL_CLUSTERS) {
    const hasAny = cluster.some((s) => skillSet.has(s));
    if (!hasAny) continue;
    for (const s of cluster) {
      if (!skillSet.has(s)) missing.add(s);
    }
  }
  return Array.from(missing).slice(0, 6);
}

const SECTION_LABELS = {
  contact: 'Contact information',
  summary: 'Professional summary',
  skills: 'Skills section',
  experience: 'Experience section',
  projects: 'Projects section',
  education: 'Education section',
  certifications: 'Certifications',
  keywords: 'Keyword / impact language',
};

const RECOMMENDATION_BUILDERS = {
  contact: () => 'Add a complete contact block with your name, email, and phone number at the top of the resume.',
  summary: () => 'Add a 2-3 sentence professional summary highlighting your role, key skills, and experience level.',
  skills: (ctx) =>
    ctx.skills.length === 0
      ? 'Add a dedicated Skills section listing your technical skills (languages, frameworks, tools).'
      : 'Expand your Skills section — only a few technical skills were detected.',
  experience: (ctx) =>
    ctx.parsed.experience.length === 0
      ? 'Add a Work Experience section describing your roles and responsibilities.'
      : 'Experience section lacks measurable achievements — add numbers (%, users, time saved) to your bullet points.',
  projects: (ctx) =>
    ctx.parsed.projects.length === 0
      ? 'Add a Projects section describing relevant technical projects.'
      : 'Project descriptions need stronger technical keywords — mention the specific technologies used.',
  education: () => 'Add an Education section with your degree, institution, and graduation year.',
  certifications: () => 'Consider adding relevant certifications to strengthen your profile.',
  keywords: () => 'Use stronger action verbs (built, led, optimized, deployed) to describe your impact.',
};

/**
 * Runs the full ATS pipeline on already-extracted resume text and
 * returns a score derived entirely from measurable, real factors —
 * never a random number.
 */
function analyzeResume(rawText, parsed) {
  const skills = extractSkills(`${rawText}\n${parsed.skillsSectionText || ''}`);

  const sectionScores = {
    contact: { score: scoreContact(parsed), max: WEIGHTS.contact },
    summary: { score: scoreSummary(parsed), max: WEIGHTS.summary },
    skills: { score: scoreSkills(skills), max: WEIGHTS.skills },
    experience: { score: scoreExperience(parsed), max: WEIGHTS.experience },
    projects: { score: scoreProjects(parsed), max: WEIGHTS.projects },
    education: { score: scoreEducation(parsed), max: WEIGHTS.education },
    certifications: { score: scoreCertifications(parsed), max: WEIGHTS.certifications },
    keywords: { score: scoreKeywords(parsed), max: WEIGHTS.keywords },
  };

  const totalScore = Object.values(sectionScores).reduce((sum, s) => sum + s.score, 0);

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  for (const [key, { score, max }] of Object.entries(sectionScores)) {
    const ratio = max === 0 ? 1 : score / max;
    if (ratio >= 0.8) {
      strengths.push(`${SECTION_LABELS[key]}: strong (${score}/${max})`);
    } else if (ratio < 0.7) {
      weaknesses.push(`${SECTION_LABELS[key]}: ${score}/${max}`);
      recommendations.push(RECOMMENDATION_BUILDERS[key]({ skills, parsed }));
    }
  }

  const missingKeywords = findMissingKeywords(skills);
  if (missingKeywords.length > 0) {
    recommendations.push(
      `Consider adding these commonly paired technologies if you've worked with them: ${missingKeywords.join(', ')}.`
    );
  }

  return {
    totalScore,
    sectionScores,
    skills,
    strengths,
    weaknesses,
    missingKeywords,
    recommendations,
  };
}

module.exports = { analyzeResume, WEIGHTS };
