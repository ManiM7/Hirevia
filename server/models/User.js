const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['candidate', 'recruiter', 'admin'],
      required: true,
      index: true,
    },
    // True until the user completes the forced first-login password change.
    temporaryPassword: {
      type: Boolean,
      default: true,
    },
    // Bumped whenever the password changes or all sessions are revoked.
    // Tokens are signed with the tokenVersion at issue time; a mismatch
    // invalidates them even if the JWT itself hasn't expired yet.
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
