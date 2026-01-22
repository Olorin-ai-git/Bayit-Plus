#!/usr/bin/env node
/**
 * Secret Management CLI
 * Command-line tool for managing application secrets
 *
 * Usage:
 *   npm run secrets:init    - Initialize all secrets
 *   npm run secrets:rotate  - Rotate rotatable secrets
 *   npm run secrets:backup  - Backup all secrets
 *   npm run secrets:restore - Restore secrets from backup
 *   npm run secrets:list    - List all secrets
 *   npm run secrets:health  - Check secret health
 */

import {
  initializeSecrets,
  rotateSecrets,
  backupSecrets,
  restoreSecrets,
  validateSecrets,
  listAllSecrets,
  checkSecretHealth,
} from '../utils/secret-manager.util';
import * as fs from 'fs';
import * as path from 'path';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'init':
        await handleInit();
        break;

      case 'rotate':
        await handleRotate();
        break;

      case 'backup':
        await handleBackup();
        break;

      case 'restore':
        await handleRestore();
        break;

      case 'list':
        await handleList();
        break;

      case 'validate':
        await handleValidate();
        break;

      case 'health':
        await handleHealth();
        break;

      default:
        printUsage();
        process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function handleInit() {
  console.log('Initializing secrets...');
  console.log('Reading values from environment variables if available');

  await initializeSecrets({
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET_KEY,
    sessionSecret: process.env.SESSION_SECRET,
    emailPassword: process.env.EMAIL_PASSWORD,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    firebaseCredentialsJson: process.env.FIREBASE_CREDENTIALS_JSON,
    redisPassword: process.env.REDIS_PASSWORD,
    force: process.env.FORCE === 'true',
  });
}

async function handleRotate() {
  console.log('WARNING: This will rotate all rotatable secrets.');
  console.log('You will need to restart the application after rotation.');
  console.log('');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  await rotateSecrets();
}

async function handleBackup() {
  const backup = await backupSecrets();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(process.cwd(), `secrets-backup-${timestamp}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

  console.log('');
  console.log(`✅ Secrets backed up to: ${backupFile}`);
  console.log('⚠️  WARNING: This file contains sensitive data. Store it securely and delete after use.');
}

async function handleRestore() {
  const backupFile = process.argv[3];

  if (!backupFile) {
    console.error('❌ Error: Backup file path required');
    console.log('Usage: npm run secrets:restore <backup-file>');
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Error: Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  console.log('WARNING: This will restore all secrets from the backup.');
  console.log('Existing secrets will be overwritten.');
  console.log('');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  await restoreSecrets(backup);
}

async function handleList() {
  await listAllSecrets();
}

async function handleValidate() {
  const result = await validateSecrets();

  if (result.valid) {
    console.log('');
    console.log('✅ All required secrets are valid');
  } else {
    console.log('');
    console.log('❌ Validation failed');
    console.log(`Missing secrets: ${result.missing.join(', ')}`);
    process.exit(1);
  }
}

async function handleHealth() {
  const result = await checkSecretHealth();

  if (result.healthy) {
    console.log('');
    console.log('✅ All secrets are healthy');
  } else {
    console.log('');
    console.log('⚠️  Health check warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
}

function printUsage() {
  console.log('');
  console.log('Secret Management CLI');
  console.log('');
  console.log('Usage:');
  console.log('  npm run secrets:init    - Initialize all secrets');
  console.log('  npm run secrets:rotate  - Rotate rotatable secrets');
  console.log('  npm run secrets:backup  - Backup all secrets');
  console.log('  npm run secrets:restore <file> - Restore secrets from backup');
  console.log('  npm run secrets:list    - List all secrets');
  console.log('  npm run secrets:validate - Validate required secrets');
  console.log('  npm run secrets:health  - Check secret health');
  console.log('');
}

main();
