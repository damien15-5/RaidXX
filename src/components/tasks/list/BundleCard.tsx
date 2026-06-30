/**
 * BundleCard.tsx
 * --------------
 * Summary card for a task bundle shown in the TaskList grid.
 * Tapping it opens the BundleDetail sheet.
 *
 * Shows:
 *  - Status badge (active / submitted)
 *  - Time since created
 *  - Poster wallet address
 *  - Sub-task pills (type + count)
 *  - Total order count
 *  - Social / quest breakdown
 */

import type { TaskBundle, SocialSubTask, QuestSubTask } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Format large counts: 1500 → "1.5k", 2_000_000 → "2.0M"
const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`     :
  n.toString();

// Time since a date string: "3h ago", "2d ago"
const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Colour map for each social task type
const SOCIAL_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  FOLLOW:  { label: 'Follow',  icon: 'fa-user-plus',    color: 'text-sky-500',    bg: 'bg-sky-50 border-sky-100' },
  RETWEET: { label: 'Retweet', icon: 'fa-retweet',      color: 'text-green-500',  bg: 'bg-green-50 border-green-100' },
  COMMENT: { label: 'Comment', icon: 'fa-comment-dots', color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-100' },
  TWEET:   { label: 'Tweet',   icon: 'fa-pen-nib',      color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-100' },
  QUOTE:   { label: 'Quote',   icon: 'fa-quote-right',  color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100' },
};

// ── Small pill shown on the card for each sub-task ────────────────────────────
const SubTaskPill = ({ task }: { task: TaskBundle['tasks_data'][number] }) => {
  if (task.type === 'QUEST') {
    const q = task as QuestSubTask;
    return (
      <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1">
        <i className="fa-solid fa-circle-question text-violet-400 text-[10px]" />
        <span className="text-[10px] font-semibold text-violet-700 truncate max-w-[120px]">
          {q.question.slice(0, 28)}{q.question.length > 28 ? '…' : ''}
        </span>
        <span className="text-[10px] text-violet-400 ml-auto shrink-0">
          ×{fmtCount(task.count)}
        </span>
      </div>
    );
  }

  const s = task as SocialSubTask;
  const m = SOCIAL_META[s.task_name] ?? SOCIAL_META.FOLLOW;
  return (
    <div className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 ${m.bg}`}>
      <i className={`fa-solid ${m.icon} ${m.color} text-[10px]`} />
      <span className={`text-[10px] font-semibold ${m.color}`}>{m.label}</span>
      <span className={`text-[10px] ${m.color} opacity-60 ml-auto shrink-0`}>
        ×{fmtCount(task.count)}
      </span>
    </div>
  );
};

// ── Main card ─────────────────────────────────────────────────────────────────
interface BundleCardProps {
  bundle: TaskBundle;
  onClick: () => void;
}

const BundleCard = ({ bundle, onClick }: BundleCardProps) => {
  const isActive    = bundle.status === 'active';
  const totalOrders = bundle.tasks_data.reduce((a, t) => a + t.count, 0);
  const socialCount = bundle.tasks_data.filter((t) => t.type === 'SOCIAL').length;
  const questCount  = bundle.tasks_data.filter((t) => t.type === 'QUEST').length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99] group"
    >
      {/* ── Top section ── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Status badge + time */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider
              px-2 py-0.5 rounded-full
              ${isActive
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-gray-100 text-gray-400 border border-gray-200'}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              {bundle.status}
            </span>
            <span className="text-[10px] text-gray-300">{timeAgo(bundle.created_at)}</span>
          </div>

          {/* Poster wallet */}
          <p className="text-[11px] text-gray-400 font-mono truncate">
            by {bundle.posted_by}
          </p>
        </div>

        {/* Total orders */}
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-400 font-semibold">Total orders</p>
          <p className="text-sm font-extrabold text-gray-900">{fmtCount(totalOrders)}</p>
        </div>
      </div>

      {/* ── Sub-task pills ── */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {bundle.tasks_data.map((t) => (
          <SubTaskPill key={t.sub_task_id} task={t} />
        ))}
      </div>

      {/* ── Footer meta row ── */}
      <div className="px-4 py-2.5 bg-gray-50/70 border-t border-gray-100/60 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
          {socialCount > 0 && (
            <span><i className="fa-brands fa-x-twitter mr-1" />{socialCount} social</span>
          )}
          {questCount > 0 && (
            <span>
              <i className="fa-solid fa-circle-question mr-1" />
              {questCount} quest{questCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-[10px] text-brand-600 font-bold group-hover:translate-x-0.5 transition-transform">
          View <i className="fa-solid fa-arrow-right text-[9px]" />
        </span>
      </div>
    </button>
  );
};

export default BundleCard;
