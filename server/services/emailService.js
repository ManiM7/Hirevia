const nodemailer = require('nodemailer');
const { smtp, clientUrl, nodeEnv } = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!smtp.host || !smtp.user || !smtp.pass) return null;
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  return transporter;
}

/**
 * Sends an email via the configured SMTP transport. Throws if SMTP isn't
 * configured or the send fails — callers must not pretend an email was
 * sent when it wasn't (see spec section 40).
 */
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    const err = new Error(
      'Email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in the server .env file.'
    );
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  return t.sendMail({ from: smtp.from, to, subject, html, text });
}

async function sendTemporaryPasswordEmail({ to, fullName, temporaryPassword }) {
  const loginUrl = `${clientUrl}/login`;
  const subject = 'Your Hirevia account has been created';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Welcome to Hirevia, ${fullName}</h2>
      <p>Your account has been created successfully.</p>
      <p><strong>Temporary password:</strong></p>
      <p style="font-size: 18px; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 6px;">${temporaryPassword}</p>
      <p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p>You must change this temporary password after your first login.</p>
    </div>
  `;
  const text = `Welcome to Hirevia, ${fullName}.\n\nYour temporary password: ${temporaryPassword}\nLogin: ${loginUrl}\n\nYou must change this temporary password after your first login.`;
  await sendMail({ to, subject, html, text });
}

async function sendPasswordChangedEmail({ to, fullName }) {
  const subject = 'Your Hirevia password was changed';
  const html = `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Hi ${fullName},</h2>
      <p>Your Hirevia account password was changed successfully. If this wasn't you, contact support immediately.</p>
    </div>`;
  await sendMail({ to, subject, html, text: `Hi ${fullName}, your Hirevia password was changed successfully.` });
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const subject = 'Reset your Hirevia password';
  const html = `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Password reset requested</h2>
      <p>Click the link below to set a new password. This link expires in 15 minutes.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>`;
  await sendMail({ to, subject, html, text: `Reset your password: ${resetUrl} (expires in 15 minutes)` });
}

module.exports = {
  sendMail,
  sendTemporaryPasswordEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  isConfigured: () => !!getTransporter(),
};

if (nodeEnv !== 'production' && !getTransporter()) {
  console.warn('[email] SMTP not configured — emails will fail to send until SMTP_HOST/SMTP_USER/SMTP_PASS are set in .env');
}
