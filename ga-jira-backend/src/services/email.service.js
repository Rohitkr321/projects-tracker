const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"${process.env.APP_NAME || 'GA Jira'}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

const sendPasswordReset = async (user, resetUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'Password Reset - GA Jira',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.firstName},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};

const sendInvitation = async (email, inviterName, orgName, inviteUrl) => {
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${orgName} on GA Jira`,
    html: `
      <h2>You're Invited!</h2>
      <p>${inviterName} has invited you to join <strong>${orgName}</strong> on GA Jira.</p>
      <a href="${inviteUrl}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a>
    `,
  });
};

module.exports = { sendEmail, sendPasswordReset, sendInvitation };
