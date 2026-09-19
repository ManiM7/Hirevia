const mongoose = require('mongoose');

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    location: { type: String, trim: true, index: true },
    dateOfBirth: { type: Date, default: null },
    profilePhoto: { type: String, default: null }, // stored filename (served via /uploads route)

    highestEducation: { type: String, trim: true, default: '' },
    experienceLevel: {
      type: String,
      enum: ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      default: 'Fresher',
    },
    yearsOfExperience: { type: Number, default: 0, min: 0, max: 60 },
    currentRole: { type: String, trim: true, default: '' },
    preferredRole: { type: String, trim: true, default: '', index: true },
    preferredLocation: { type: String, trim: true, default: '' },
    githubProfile: { type: String, trim: true, default: '' },
    linkedinProfile: { type: String, trim: true, default: '' },

    // Self-reported only — never inferred from name or resume. Required to
    // pick a gender-appropriate AI interviewer voice (opposite gender) for
    // the voice interview feature; null means "not set yet".
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    areaOfInterest: { type: String, trim: true, default: '' },
    careerObjective: { type: String, trim: true, default: '' },

    // Normalized technical skills, e.g. ["JavaScript", "React", "Node.js"].
    // Populated automatically from resume parsing (Phase 4); candidate may
    // also edit manually later.
    skills: [{ type: String, index: true }],

    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
    latestResumeAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis', default: null },
    atsScore: { type: Number, default: null, min: 0, max: 100, index: true },

    // Denormalized assessment aggregates, recalculated after every attempt
    // so recruiter search/sort/filter never has to scan AssessmentAttempt.
    assessmentStats: {
      testsCompleted: { type: Number, default: 0 },
      averageScore: { type: Number, default: null },
      bestScore: { type: Number, default: null },
      strongestSkill: { type: String, default: null },
      weakestSkill: { type: String, default: null },
      questionsAnswered: { type: Number, default: 0 },
      correctAnswered: { type: Number, default: 0 },
    },
    assessmentScore: { type: Number, default: null, min: 0, max: 100, index: true }, // = averageScore, indexed for filtering

    latestInterviewAttempt: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewAttempt', default: null },
    interviewScore: { type: Number, default: null, min: 0, max: 100, index: true },

    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },

    lastActive: { type: Date, default: Date.now, index: true },
    lastResumeUpdate: { type: Date, default: null },
    lastAssessmentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

candidateProfileSchema.index({ skills: 1, location: 1 });
candidateProfileSchema.index({ atsScore: -1, assessmentScore: -1 });
candidateProfileSchema.index({ fullName: 'text', currentRole: 'text', preferredRole: 'text' });

const REQUIRED_FOR_COMPLETENESS = [
  'fullName',
  'mobile',
  'location',
  'profilePhoto',
  'highestEducation',
  'currentRole',
  'preferredRole',
  'preferredLocation',
];

candidateProfileSchema.methods.recalculateCompleteness = function recalculateCompleteness() {
  let filled = 0;
  const total = REQUIRED_FOR_COMPLETENESS.length + 2; // +resume +skills
  for (const field of REQUIRED_FOR_COMPLETENESS) {
    if (this[field]) filled += 1;
  }
  if (this.resume) filled += 1;
  if (this.skills && this.skills.length > 0) filled += 1;
  this.profileCompleteness = Math.round((filled / total) * 100);
  return this.profileCompleteness;
};

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);
