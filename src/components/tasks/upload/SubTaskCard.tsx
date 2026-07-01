
import type { SubTask, SocialSubTask, QuestSubTask } from '../types';
import { SOCIAL_TASKS, calcFee, fmtPts } from '../pricing';

interface SubTaskCardProps {
  task: SubTask;
  index: number;  // position in the list (0-based)
  total: number;  // total number of tasks (used to hide the thread line on last item)
  onRemove: () => void;
}

const SubTaskCard = ({ task, index, total, onRemove }: SubTaskCardProps) => {
  const isSocial = task.type === 'SOCIAL';

  // Find display metadata for social tasks
  const socialMeta = isSocial
    ? SOCIAL_TASKS.find((t) => t.name === (task as SocialSubTask).task_name)
    : null;

  // Calculate fee for this specific sub-task
  const fee = calcFee(
    task.type,
    isSocial ? (task as SocialSubTask).task_name : null,
    task.count,
  );

  return (
    <div className="relative pl-8">
      {/* Vertical thread line — hidden on the last card */}
      {index < total - 1 && (
        <div className="absolute left-[14px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />
      )}

      {/* Coloured dot on the thread line */}
      <div className={`
        absolute left-[7px] top-3.5 w-3.5 h-3.5 rounded-full border-2
        ${isSocial ? 'border-sky-400 bg-sky-50' : 'border-violet-400 bg-violet-50'}
      `} />

      {/* Card body */}
      <div className={`
        mb-3 rounded-2xl border p-3.5 transition-all
        ${isSocial ? 'border-sky-100/80 bg-white' : 'border-violet-100/80 bg-white'}
      `}>
        {/* Top row: icon + title + delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Task type icon */}
            <div className={`
              w-8 h-8 rounded-xl flex items-center justify-center shrink-0
              ${isSocial
                ? 'bg-gradient-to-br from-sky-400 to-blue-600'
                : 'bg-gradient-to-br from-violet-400 to-purple-600'}
            `}>
              <i className={`
                fa-solid
                ${isSocial ? socialMeta?.icon : 'fa-circle-question'}
                text-white text-xs
              `} />
            </div>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-gray-900 truncate">
                {isSocial ? socialMeta?.label : `Q: ${(task as QuestSubTask).question.slice(0, 40)}${(task as QuestSubTask).question.length > 40 ? '…' : ''}`}
              </p>

              {/* Social → show URL; Quest → show option count */}
              {isSocial ? (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {(task as SocialSubTask).target_url || '—'}
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {(task as QuestSubTask).options.length} options
                  {(task as QuestSubTask).allow_custom_answer ? ' · custom allowed' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={onRemove}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0"
            aria-label="Remove task"
          >
            <i className="fa-solid fa-trash-can text-xs" />
          </button>
        </div>

        {/* Bottom row: order count + fee badge */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <i className="fa-solid fa-users text-[9px]" />
            <span className="font-bold text-gray-700">{task.count.toLocaleString()}</span>
            <span>orders</span>
          </div>
          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            {fmtPts(fee)} PTS
          </span>
        </div>
      </div>
    </div>
  );
};

export default SubTaskCard;
