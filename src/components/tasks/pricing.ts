
import type { SocialTaskName } from './types';

// Points charged per 1,000 orders
export const SOCIAL_PRICE_PER_1K: Record<SocialTaskName, number> = {
  FOLLOW:  500,
  RETWEET: 400,
  COMMENT: 500,
  TWEET:   700,
  QUOTE:   550,
};

// Flat rate for all quest types
export const QUEST_PRICE_PER_1K = 300;

// Calculate the total fee for a sub-task (count * points_per_completion)
export function calcFee(
  _type: 'SOCIAL' | 'QUEST',
  _taskName: SocialTaskName | null,
  count: number,
  points: number = 5
): number {
  return count * points;
}

// Format large point numbers nicely
// e.g. 1500 → "1.5k",  2_500_000 → "2.5M"
export function fmtPts(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

// Clamp an order-count string to valid range [1, 1_000_000]
export function clampCount(v: string): number {
  const n = parseInt(v.replace(/\D/g, ''), 10);
  if (isNaN(n) || n < 1) return 1;
  if (n > 1_000_000) return 1_000_000;
  return n;
}

// Generate a short random ID for sub-tasks
export const uid = (): string =>
  'task_' + Math.random().toString(36).slice(2, 9);

// Social task display metadata
// Add a new entry here to support a new type of social task.
export const SOCIAL_TASKS: {
  name: SocialTaskName;
  label: string;
  icon: string;
  placeholder: string;
}[] = [
  {
    name: 'FOLLOW',
    label: 'Follow X Account',
    icon: 'fa-user-plus',
    placeholder: 'https://x.com/username',
  },
  {
    name: 'RETWEET',
    label: 'Retweet X Post',
    icon: 'fa-retweet',
    placeholder: 'https://x.com/user/status/...',
  },
  {
    name: 'COMMENT',
    label: 'Comment on X Post',
    icon: 'fa-comment-dots',
    placeholder: 'https://x.com/user/status/...',
  },
  {
    name: 'TWEET',
    label: 'Tweet Something on X',
    icon: 'fa-pen-nib',
    placeholder: 'https://x.com/intent/tweet?text=...',
  },
  {
    name: 'QUOTE',
    label: 'Quote X Post',
    icon: 'fa-quote-right',
    placeholder: 'https://x.com/user/status/...',
  },
];
