const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { Webhook } = require('../models');

const triggerWebhooks = async (projectId, event, payload) => {
  const webhooks = await Webhook.findAll({ where: { projectId, isActive: true } });
  for (const webhook of webhooks) {
    if (!webhook.events.includes(event)) continue;
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = webhook.secret
      ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      : null;
    const url = new URL(webhook.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-GA-Jira-Event': event,
        ...(signature && { 'X-GA-Jira-Signature': `sha256=${signature}` }),
      },
    };
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, () => {
      webhook.update({ lastTriggeredAt: new Date(), failureCount: 0 }).catch(() => {});
    });
    req.on('error', () => {
      webhook.increment('failureCount').catch(() => {});
    });
    req.write(body);
    req.end();
  }
};

module.exports = { triggerWebhooks };
