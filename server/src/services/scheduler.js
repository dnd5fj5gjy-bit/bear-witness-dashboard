import cron from 'node-cron';
import { getDuePosts } from '../db.js';
import { publishPost } from './publisher.js';

const log = (msg) => console.log(`[${new Date().toISOString()}] [scheduler] ${msg}`);

let cronTask = null;
let lastCheckAt = null;
let isRunning = false;
let postsProcessed = 0;

/**
 * The scheduler tick — runs every minute, picks up due posts, publishes them.
 */
async function schedulerTick() {
  if (isRunning) {
    log('Previous tick still running, skipping.');
    return;
  }

  isRunning = true;
  lastCheckAt = new Date().toISOString();

  try {
    const duePosts = getDuePosts();

    if (duePosts.length === 0) {
      isRunning = false;
      return;
    }

    log(`Found ${duePosts.length} due post(s) to publish.`);

    for (const post of duePosts) {
      try {
        const result = await publishPost(post.id);
        postsProcessed++;
        if (result.success) {
          log(`Post ${post.id} published via scheduler.`);
        } else {
          log(`Post ${post.id} failed via scheduler: ${result.error}`);
        }
      } catch (err) {
        log(`Scheduler error processing post ${post.id}: ${err.message}`);
      }
    }
  } catch (err) {
    log(`Scheduler tick error: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron scheduler (every minute).
 */
export function startScheduler() {
  if (cronTask) {
    log('Scheduler already running.');
    return;
  }

  cronTask = cron.schedule('* * * * *', schedulerTick, {
    scheduled: true,
  });

  log('Scheduler started (checking every minute).');
}

/**
 * Stop the cron scheduler.
 */
export function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    log('Scheduler stopped.');
  }
}

/**
 * Get current scheduler status.
 */
export function getSchedulerStatus() {
  return {
    running: !!cronTask,
    lastCheckAt,
    isProcessing: isRunning,
    totalPostsProcessed: postsProcessed,
  };
}
