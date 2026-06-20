const { Op } = require('sequelize');
const { Issue, User, WorkflowStatus } = require('../models');
const { Notification } = require('../models');
const { notifyDueDateReminder } = require('../services/notification.service');

const REMINDER_WINDOWS_HOURS = [48, 24]; // send reminders at these thresholds

const getTodayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

/* Check whether a reminder was already sent today for this issue at this threshold */
const alreadyNotifiedToday = async (issueId, hoursThreshold) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await Notification.count({
    where: {
      type: 'due_date_reminder',
      data: { [Op.like]: `%"issueId":"${issueId}"%` },
      createdAt: { [Op.gte]: startOfDay },
    },
  });
  return count > 0;
};

const runDueDateReminderJob = async () => {
  try {
    const now = new Date();

    for (const hours of REMINDER_WINDOWS_HOURS) {
      const windowStart = new Date(now.getTime() + (hours - 1) * 60 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + (hours + 1) * 60 * 60 * 1000);

      const startDate = windowStart.toISOString().slice(0, 10);
      const endDate   = windowEnd.toISOString().slice(0, 10);

      const issues = await Issue.findAll({
        where: {
          dueDate: { [Op.between]: [startDate, endDate] },
          assigneeId: { [Op.not]: null },
          resolvedAt: null,
        },
        include: [
          { model: WorkflowStatus, as: 'status', attributes: ['name', 'category'] },
        ],
      });

      for (const issue of issues) {
        // Skip issues already in a done category
        if (issue.status?.category === 'done') continue;

        const alreadySent = await alreadyNotifiedToday(issue.id, hours);
        if (alreadySent) continue;

        await notifyDueDateReminder(issue, hours);
        console.log(`[DueDateReminder] Notified ${issue.key} (${hours}h window)`);
      }
    }
  } catch (err) {
    console.error('[DueDateReminder] Job error:', err.message);
  }
};

/* Start the job — runs immediately on startup, then every hour */
const startDueDateReminderJob = () => {
  console.log('[DueDateReminder] Job scheduled — running every hour');
  runDueDateReminderJob(); // run once on boot
  setInterval(runDueDateReminderJob, 60 * 60 * 1000); // then every hour
};

module.exports = { startDueDateReminderJob };
