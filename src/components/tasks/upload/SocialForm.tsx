
import { useState } from 'react';
import type { SocialTaskName, SocialSubTask } from '../types';
import { SOCIAL_TASKS, calcFee, uid } from '../pricing';
import BottomSheet from '../BottomSheet';
import CountInput from './CountInput';

interface SocialFormProps {
  taskName: SocialTaskName;
  onSave: (task: SocialSubTask) => void;
  onClose: () => void;
}

const SocialForm = ({ taskName, onSave, onClose }: SocialFormProps) => {
  const [url, setUrl]     = useState('');
  const [count, setCount] = useState(100); // default order count
  const [points, setPoints] = useState(5); // default points per completion

  // Find display metadata for this task type
  const meta = SOCIAL_TASKS.find((t) => t.name === taskName)!;

  // Live fee preview
  const fee = calcFee('SOCIAL', taskName, count, points);

  // Build the sub-task object and hand it to the parent
  const handleSave = () => {
    if (!url.trim()) return;
    onSave({
      sub_task_id: uid(),
      type: 'SOCIAL',
      task_name: taskName,
      target_url: url.trim(),
      count,
      points,
      status: 'active',
    } as any);
  };

  return (
    <BottomSheet onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0">
          <i className={`fa-solid ${meta.icon} text-white text-sm`} />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Social Task</p>
          <h3 className="text-sm font-extrabold text-gray-900">{meta.label}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Target URL input */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Target URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Points per completion input */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Points per completion (default: 5)
          </label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-mono"
          />
        </div>

        {/* Order count stepper */}
        <CountInput
          label="Number of orders"
          value={count}
          onChange={setCount}
          fee={fee}
          rateLabel={`${points} PTS per completion`}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs transition-all"
        >
          Cancel
        </button>
        <button
          disabled={!url.trim()}
          onClick={handleSave}
          className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-xs transition-all"
        >
          Add Task
        </button>
      </div>
    </BottomSheet>
  );
};

export default SocialForm;
