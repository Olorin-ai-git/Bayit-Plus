#!/usr/bin/env node

/**
 * Deployment Notification Script
 *
 * Sends notifications via Slack and email about deployment status.
 * Supports success, rollback, and failure notifications.
 *
 * Usage: node send-notification.js <status> [message]
 *
 * Arguments:
 * - status: 'success' | 'rollback' | 'failure' | 'warning'
 * - message: Optional custom message (default: auto-generated)
 *
 * Environment Variables:
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL (optional)
 * - EMAIL_SERVICE: Email service (e.g., 'gmail', 'sendgrid')
 * - EMAIL_USER: Email sender username
 * - EMAIL_PASSWORD: Email sender password or API key
 * - EMAIL_TO: Comma-separated list of recipient emails
 * - ENVIRONMENT: Deployment environment (default: 'production')
 * - DEPLOYMENT_URL: URL of deployed application (optional)
 *
 * Exit Codes:
 * - 0: Notification sent successfully
 * - 1: Notification failed
 */

const https = require('https');
const nodemailer = require('nodemailer');

const STATUS_EMOJI = {
  success: '✅',
  rollback: '⚠️',
  failure: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const STATUS_COLORS = {
  success: '#36a64f', // Green
  rollback: '#ff9900', // Orange
  failure: '#ff0000', // Red
  warning: '#ffcc00', // Yellow
  info: '#0099ff', // Blue
};

function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node send-notification.js <status> [message]');
    console.error('Status: success | rollback | failure | warning | info');
    process.exit(1);
  }

  const status = args[0].toLowerCase();
  const validStatuses = ['success', 'rollback', 'failure', 'warning', 'info'];

  if (!validStatuses.includes(status)) {
    console.error(`Invalid status: ${status}`);
    console.error(`Valid statuses: ${validStatuses.join(', ')}`);
    process.exit(1);
  }

  const customMessage = args.slice(1).join(' ');

  return { status, customMessage };
}

function generateMessage(status, customMessage) {
  const environment = process.env.ENVIRONMENT || 'production';
  const timestamp = new Date().toISOString();
  const deploymentUrl = process.env.DEPLOYMENT_URL || 'Not specified';

  if (customMessage) {
    return {
      title: `${STATUS_EMOJI[status]} MongoDB Migration ${status.toUpperCase()}`,
      text: customMessage,
      environment,
      timestamp,
      deploymentUrl,
    };
  }

  const defaultMessages = {
    success: {
      title: '✅ MongoDB Migration SUCCESS',
      text: `MongoDB Atlas migration completed successfully in ${environment}. All data has been migrated and verified.`,
    },
    rollback: {
      title: '⚠️ MongoDB Migration ROLLBACK',
      text: `MongoDB migration was rolled back in ${environment}. System has been restored to Firestore. Please investigate and retry.`,
    },
    failure: {
      title: '❌ MongoDB Migration FAILURE',
      text: `MongoDB migration failed in ${environment}. System may be in an inconsistent state. Immediate attention required.`,
    },
    warning: {
      title: '⚠️ MongoDB Migration WARNING',
      text: `MongoDB migration completed with warnings in ${environment}. Review logs for potential issues.`,
    },
    info: {
      title: 'ℹ️ MongoDB Migration INFO',
      text: `MongoDB migration information for ${environment}.`,
    },
  };

  return {
    ...defaultMessages[status],
    environment,
    timestamp,
    deploymentUrl,
  };
}

async function sendSlackNotification(status, message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('ℹ️  Slack webhook URL not configured, skipping Slack notification');
    return false;
  }

  console.log('📤 Sending Slack notification...');

  const payload = {
    username: 'MongoDB Migration Bot',
    icon_emoji: STATUS_EMOJI[status],
    attachments: [
      {
        color: STATUS_COLORS[status],
        title: message.title,
        text: message.text,
        fields: [
          {
            title: 'Environment',
            value: message.environment,
            short: true,
          },
          {
            title: 'Timestamp',
            value: message.timestamp,
            short: true,
          },
          {
            title: 'Deployment URL',
            value: message.deploymentUrl,
            short: false,
          },
        ],
        footer: 'CVPlus MongoDB Migration',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Slack notification sent successfully');
          resolve(true);
        } else {
          console.error(`❌ Slack notification failed: ${res.statusCode} ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Slack notification error: ${error.message}`);
      resolve(false);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function sendEmailNotification(status, message) {
  const emailService = process.env.EMAIL_SERVICE;
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailTo = process.env.EMAIL_TO;

  if (!emailService || !emailUser || !emailPassword || !emailTo) {
    console.log('ℹ️  Email configuration incomplete, skipping email notification');
    console.log('   Required: EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD, EMAIL_TO');
    return false;
  }

  console.log('📤 Sending email notification...');

  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  const recipients = emailTo.split(',').map((email) => email.trim());

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${STATUS_COLORS[status]}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .info-table { width: 100%; margin-top: 20px; }
        .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${message.title}</h1>
        </div>
        <div class="content">
          <p>${message.text}</p>
          <table class="info-table">
            <tr>
              <td>Environment:</td>
              <td>${message.environment}</td>
            </tr>
            <tr>
              <td>Timestamp:</td>
              <td>${message.timestamp}</td>
            </tr>
            <tr>
              <td>Deployment URL:</td>
              <td><a href="${message.deploymentUrl}">${message.deploymentUrl}</a></td>
            </tr>
          </table>
        </div>
        <div class="footer">
          <p>CVPlus MongoDB Migration Notification System</p>
          <p>This is an automated message. Do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"CVPlus Deployment" <${emailUser}>`,
    to: recipients,
    subject: `[${message.environment.toUpperCase()}] ${message.title}`,
    text: `${message.title}\n\n${message.text}\n\nEnvironment: ${message.environment}\nTimestamp: ${message.timestamp}\nDeployment URL: ${message.deploymentUrl}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email notification sent to ${recipients.length} recipient(s)`);
    return true;
  } catch (error) {
    console.error(`❌ Email notification error: ${error.message}`);
    return false;
  }
}

async function main() {
  const { status, customMessage } = parseArguments();
  const message = generateMessage(status, customMessage);

  console.log('📬 MongoDB Migration Notification');
  console.log('─'.repeat(50));
  console.log(`Status: ${status}`);
  console.log(`Environment: ${message.environment}`);
  console.log(`Title: ${message.title}`);
  console.log(`Message: ${message.text}`);
  console.log('─'.repeat(50));

  const results = await Promise.all([
    sendSlackNotification(status, message),
    sendEmailNotification(status, message),
  ]);

  const [slackSuccess, emailSuccess] = results;

  console.log('\n' + '═'.repeat(50));
  if (slackSuccess || emailSuccess) {
    console.log('✅ NOTIFICATION SENT SUCCESSFULLY');
    const channels = [];
    if (slackSuccess) channels.push('Slack');
    if (emailSuccess) channels.push('Email');
    console.log(`   Channels: ${channels.join(', ')}`);
    process.exit(0);
  } else {
    console.error('❌ NOTIFICATION FAILED');
    console.error('   No notifications were sent successfully');
    console.error('   Check configuration and logs above');
    process.exit(1);
  }
}

// Run notification
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
