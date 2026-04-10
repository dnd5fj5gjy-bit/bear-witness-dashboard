/**
 * Daily backup job — copies the SQLite database at 3am and prunes old backups.
 */

import cron from 'node-cron';
import { backupDatabase } from './dashboardDb.js';

let task = null;

export function startBackupJob() {
  // Run at 3:00 AM every day
  task = cron.schedule('0 3 * * *', () => {
    console.log(`[${new Date().toISOString()}] Running scheduled backup...`);
    backupDatabase();
  });

  console.log(`[${new Date().toISOString()}] Backup job scheduled (daily at 03:00)`);
}

export function stopBackupJob() {
  if (task) {
    task.stop();
    task = null;
  }
}
