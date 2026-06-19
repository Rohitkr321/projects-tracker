const nodemailer = require('nodemailer');

const NAVY = '#0F2557';
const GOLD = '#B8AA6E';
const APP_URL = process.env.APP_URL || 'http://localhost:8081';

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
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
    const t = getTransporter();
    await t.sendMail({
      from: `"${process.env.APP_NAME || 'GA Jira'}" <${process.env.EMAIL_FROM}>`,
      to, subject, html, text,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

/* ─── Shared layout ─── */
const btn = (href, label) =>
  `<a href="${href}" style="background:${NAVY};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;margin-top:20px;">${label}</a>`;

const layout = (content) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#EFF3F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,37,87,0.10);">
      <tr><td style="background:${NAVY};padding:28px 36px;">
        <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.3px;">General Aeronautics</div>
        <div style="color:${GOLD};font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;margin-top:5px;">GA Jira · Project Tracker</div>
      </td></tr>
      <tr><td style="background:${GOLD};height:3px;"></td></tr>
      <tr><td style="padding:32px 36px;color:#1E293B;font-size:14px;line-height:22px;">${content}</td></tr>
      <tr><td style="background:#F8FAFC;padding:18px 36px;border-top:1px solid #E2E8F0;">
        <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
          You received this because you're a member of General Aeronautics on GA Jira.<br>
          Manage preferences in <a href="${APP_URL}/profile" style="color:${NAVY};">Profile → Notification Settings</a>.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

const metaRow = (label, value) =>
  `<tr>
     <td style="padding:6px 12px 6px 0;color:#64748B;font-size:12px;white-space:nowrap;">${label}</td>
     <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E293B;">${value}</td>
   </tr>`;

/* ─── Issue assigned ─── */
const sendIssueAssignedEmail = async (recipient, issue, actor) => {
  await sendEmail({
    to: recipient.email,
    subject: `[GA Jira] Issue assigned to you — ${issue.key}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">Issue Assigned to You</h2>
      <p style="margin:0 0 20px;color:#64748B;">${actor.firstName} ${actor.lastName} assigned you an issue.</p>
      <div style="background:#F8FAFC;border-radius:10px;padding:18px 20px;border-left:4px solid ${NAVY};margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:10px;">${issue.title}</div>
        <table cellpadding="0" cellspacing="0">
          ${metaRow('Key', issue.key)}
          ${metaRow('Type', issue.type || 'Task')}
          ${metaRow('Priority', issue.priority || 'Medium')}
          ${issue.dueDate ? metaRow('Due', new Date(issue.dueDate).toDateString()) : ''}
        </table>
      </div>
      ${btn(`${APP_URL}/issues/${issue.id}`, 'View Issue →')}
    `),
  });
};

/* ─── Mentioned in comment ─── */
const sendMentionedEmail = async (recipient, issue, actor, commentPreview) => {
  await sendEmail({
    to: recipient.email,
    subject: `[GA Jira] ${actor.firstName} mentioned you in ${issue.key}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">You Were Mentioned</h2>
      <p style="margin:0 0 20px;color:#64748B;"><strong>${actor.firstName} ${actor.lastName}</strong> mentioned you in a comment on <strong>${issue.key}</strong>.</p>
      ${commentPreview ? `
      <div style="background:#F1F5F9;border-radius:10px;padding:16px 20px;border-left:3px solid ${GOLD};margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#334155;font-style:italic;">"${commentPreview.substring(0, 200)}${commentPreview.length > 200 ? '…' : ''}"</p>
      </div>` : ''}
      <div style="font-size:13px;color:#64748B;margin-bottom:4px;">Issue</div>
      <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:20px;">${issue.key}: ${issue.title}</div>
      ${btn(`${APP_URL}/issues/${issue.id}`, 'View Comment →')}
    `),
  });
};

/* ─── Comment on watched issue ─── */
const sendCommentAddedEmail = async (recipient, issue, actor) => {
  await sendEmail({
    to: recipient.email,
    subject: `[GA Jira] New comment on ${issue.key}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">New Comment</h2>
      <p style="margin:0 0 20px;color:#64748B;"><strong>${actor.firstName} ${actor.lastName}</strong> commented on an issue you're watching.</p>
      <div style="background:#F8FAFC;border-radius:10px;padding:18px 20px;border-left:4px solid #6366F1;margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;color:#0F172A;">${issue.key}: ${issue.title}</div>
      </div>
      ${btn(`${APP_URL}/issues/${issue.id}`, 'View Issue →')}
    `),
  });
};

/* ─── Sprint started ─── */
const sendSprintStartedEmail = async (recipient, sprint, project) => {
  await sendEmail({
    to: recipient.email,
    subject: `[GA Jira] Sprint started — ${sprint.name}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">Sprint Started 🚀</h2>
      <p style="margin:0 0 20px;color:#64748B;">A new sprint has kicked off in <strong>${project?.name || 'your project'}</strong>.</p>
      <div style="background:#F8FAFC;border-radius:10px;padding:18px 20px;border-left:4px solid #059669;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:8px;">${sprint.name}</div>
        ${sprint.goal ? `<div style="color:#64748B;font-size:13px;">${sprint.goal}</div>` : ''}
        <table cellpadding="0" cellspacing="0" style="margin-top:10px;">
          ${sprint.startDate ? metaRow('Start', new Date(sprint.startDate).toDateString()) : ''}
          ${sprint.endDate ? metaRow('End', new Date(sprint.endDate).toDateString()) : ''}
        </table>
      </div>
      ${btn(`${APP_URL}/project/${sprint.projectId}/sprint`, 'View Sprint →')}
    `),
  });
};

/* ─── Sprint completed ─── */
const sendSprintCompletedEmail = async (recipient, sprint, project) => {
  await sendEmail({
    to: recipient.email,
    subject: `[GA Jira] Sprint completed — ${sprint.name}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">Sprint Completed ✅</h2>
      <p style="margin:0 0 20px;color:#64748B;">Sprint <strong>${sprint.name}</strong> in <strong>${project?.name || 'your project'}</strong> has been completed.</p>
      <div style="background:#F8FAFC;border-radius:10px;padding:18px 20px;border-left:4px solid ${NAVY};margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:10px;">${sprint.name}</div>
        <table cellpadding="0" cellspacing="0">
          ${metaRow('Velocity', `${sprint.velocity || 0} story points`)}
          ${metaRow('Completed', `${sprint.completedPoints || 0} / ${sprint.totalPoints || 0} pts`)}
        </table>
      </div>
      ${btn(`${APP_URL}/project/${sprint.projectId}/sprint`, 'View Report →')}
    `),
  });
};

/* ─── Password reset (existing) ─── */
const sendPasswordReset = async (user, resetUrl) => {
  await sendEmail({
    to: user.email,
    subject: '[GA Jira] Password Reset Request',
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">Reset Your Password</h2>
      <p style="margin:0 0 20px;color:#64748B;">Hi <strong>${user.firstName}</strong>, we received a request to reset your password. This link expires in 1 hour.</p>
      ${btn(resetUrl, 'Reset Password →')}
      <p style="margin-top:20px;font-size:12px;color:#94A3B8;">If you didn't request this, you can safely ignore this email.</p>
    `),
  });
};

/* ─── Invitation (existing) ─── */
const sendInvitation = async (email, inviterName, orgName, inviteUrl) => {
  await sendEmail({
    to: email,
    subject: `[GA Jira] You've been invited to join ${orgName}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${NAVY};">You're Invited!</h2>
      <p style="margin:0 0 20px;color:#64748B;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on GA Jira.</p>
      ${btn(inviteUrl, 'Accept Invitation →')}
    `),
  });
};

module.exports = {
  sendEmail,
  sendPasswordReset,
  sendInvitation,
  sendIssueAssignedEmail,
  sendMentionedEmail,
  sendCommentAddedEmail,
  sendSprintStartedEmail,
  sendSprintCompletedEmail,
};
