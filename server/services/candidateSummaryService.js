/**
 * Produces a short "Candidate Overview" for recruiters using ONLY data
 * verified by the platform (resume parsing, ATS analysis, assessment
 * results). Never invents experience, companies, education, or
 * achievements. This is a synchronous, deterministic generator — see
 * aiProvider.js for how an external LLM could be plugged in later
 * without changing this function's contract.
 */
function generateCandidateSummary({ profile, atsAnalysis, attempts }) {
  const sentences = [];

  const topSkills = (profile.skills || []).slice(0, 5);
  if (topSkills.length > 0) {
    sentences.push(`Candidate has verified technical skills in ${topSkills.join(', ')}.`);
  } else {
    sentences.push('No technical skills have been verified from a resume yet.');
  }

  const stats = profile.assessmentStats;
  if (stats && stats.testsCompleted > 0) {
    let assessmentSentence = `Assessment performance across ${stats.testsCompleted} completed test(s) shows an average score of ${stats.averageScore}%`;
    if (stats.strongestSkill && stats.weakestSkill && stats.strongestSkill !== stats.weakestSkill) {
      assessmentSentence += `, with strongest results in ${stats.strongestSkill} and comparatively weaker performance in ${stats.weakestSkill}.`;
    } else if (stats.strongestSkill) {
      assessmentSentence += `, with strongest results in ${stats.strongestSkill}.`;
    } else {
      assessmentSentence += '.';
    }
    sentences.push(assessmentSentence);
  } else {
    sentences.push('The candidate has not completed any skill assessments yet.');
  }

  if (profile.atsScore != null) {
    let atsSentence = `Resume ATS score is ${profile.atsScore}/100`;
    if (atsAnalysis?.weaknesses?.length > 0) {
      atsSentence += `, with the main improvement area being: ${atsAnalysis.weaknesses[0].split(':')[0].toLowerCase()}.`;
    } else {
      atsSentence += '.';
    }
    sentences.push(atsSentence);
  } else {
    sentences.push('The resume has not been through ATS analysis yet.');
  }

  const terminatedCount = (attempts || []).filter((a) => a.status === 'terminated').length;
  if (terminatedCount > 0) {
    sentences.push(
      `${terminatedCount} assessment attempt(s) were terminated for integrity violations and should be reviewed.`
    );
  }

  sentences.push('This overview is generated from platform data only — the final hiring decision rests with the recruiter.');

  return {
    text: sentences.join(' '),
    generatedBy: 'rule-based',
  };
}

module.exports = { generateCandidateSummary };
