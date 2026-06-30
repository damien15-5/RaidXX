/**
 * BundleDetail.tsx
 * ----------------
 * Bottom sheet that shows the full task thread for a bundle.
 * Opens when the user taps a BundleCard.
 *
 * Shows each sub-task in thread order with:
 *  - Social tasks: icon, type label, clickable URL, order count
 *  - Quests: question text, answer options, custom-answer indicator
 *  - "Start Tasks" CTA (only for active bundles)
 */

import type { TaskBundle, SocialSubTask, QuestSubTask } from '../types';
import BottomSheet from '../BottomSheet';

// Format large numbers: 1500 → "1.5k"
const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`     :
  n.toString();

// Display metadata for social task types
const SOCIAL_META: Record<string, { label: string; icon: string }> = {
  FOLLOW:  { label: 'Follow',  icon: 'fa-user-plus' },
  RETWEET: { label: 'Retweet', icon: 'fa-retweet' },
  COMMENT: { label: 'Comment', icon: 'fa-comment-dots' },
  TWEET:   { label: 'Tweet',   icon: 'fa-pen-nib' },
  QUOTE:   { label: 'Quote',   icon: 'fa-quote-right' },
};

interface BundleDetailProps {
  bundle: TaskBundle;
  onClose: () => void;
}

const BundleDetail = ({ bundle, onClose }: BundleDetailProps) => {
  const isActive = bundle.status === 'active';

  return (
    <BottomSheet onClose={onClose}>
      {/* ── Header: status + wallet + close ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className={`
            inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider
            px-2 py-0.5 rounded-full mb-1
            ${isActive
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-gray-100 text-gray-400 border border-gray-200'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            {bundle.status}
          </span>
          <p className="text-xs text-gray-400 font-mono block">{bundle.posted_by}</p>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-gray-500 text-sm" />
        </button>
      </div>

      {/* ── Task thread ── */}
      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">
        Task Thread
      </p>

      <div>
        {bundle.tasks_data.map((task, idx) => {
          const isSocial = task.type === 'SOCIAL';
          const meta     = isSocial ? SOCIAL_META[(task as SocialSubTask).task_name] : null;
          const isLast   = idx === bundle.tasks_data.length - 1;

          return (
            <div key={task.sub_task_id} className="relative pl-7 mb-3">
              {/* Vertical thread line */}
              {!isLast && (
                <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />
              )}

              {/* Thread dot */}
              <div className={`
                absolute left-[5px] top-3 w-3 h-3 rounded-full border-2
                ${isSocial ? 'border-sky-400 bg-sky-50' : 'border-violet-400 bg-violet-50'}
              `} />

              {/* Card */}
              <div className={`
                rounded-2xl border p-3.5
                ${isSocial ? 'border-gray-100 bg-white' : 'border-violet-50 bg-violet-50/30'}
              `}>
                {/* Icon + label + count */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`
                    w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                    ${isSocial
                      ? 'bg-gradient-to-br from-sky-400 to-blue-600'
                      : 'bg-gradient-to-br from-violet-400 to-purple-600'}
                  `}>
                    <i className={`fa-solid ${isSocial ? meta?.icon : 'fa-circle-question'} text-white text-xs`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-gray-900">
                      {isSocial ? meta?.label : 'Quest'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{task.type}</p>
                  </div>
                  <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full shrink-0">
                    ×{fmtCount(task.count)}
                  </span>
                </div>

                {/* Social → URL link */}
                {isSocial && (
                  <a
                    href={(task as SocialSubTask).target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-brand-600 font-semibold break-all hover:underline"
                  >
                    {(task as SocialSubTask).target_url}
                  </a>
                )}

                {/* Quest → question + answer options */}
                {!isSocial && (() => {
                  const q = task as QuestSubTask;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-800 mb-2">{q.question}</p>
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2"
                          >
                            <span className="w-4 h-4 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-bold text-gray-400">
                                {String.fromCharCode(65 + i)}
                              </span>
                            </span>
                            <span className="text-xs text-gray-700">{opt}</span>
                          </div>
                        ))}
                        {/* Custom answer row */}
                        {q.allow_custom_answer && (
                          <div className="flex items-center gap-2 bg-white rounded-xl border border-dashed border-gray-200 px-3 py-2">
                            <i className="fa-solid fa-pen text-gray-300 text-[10px]" />
                            <span className="text-[10px] text-gray-400 italic">
                              Custom answer allowed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Tasks CTA — only for active bundles */}
      {isActive && (
        <button className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm shadow-brand-500/30 active:scale-98">
          <i className="fa-solid fa-bolt mr-2" />
          Start Tasks
        </button>
      )}
    </BottomSheet>
  );
};

export default BundleDetail;
