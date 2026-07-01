

import { useState } from 'react';
import type { QuestSubTask } from '../types';
import { calcFee, uid } from '../pricing';
import BottomSheet from '../BottomSheet';
import CountInput from './CountInput';
import Toggle from './Toggle';

interface QuestFormProps {
  onSave: (task: QuestSubTask) => void;
  onClose: () => void;
}

// Internal option shape — we need a stable key for React reconciliation
interface Option {
  id: string;
  text: string;
}

const QuestForm = ({ onSave, onClose }: QuestFormProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { id: uid(), text: '' },
    { id: uid(), text: '' },
  ]);
  const [allowCustom, setAllowCustom] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [count, setCount] = useState(100);
  const [points, setPoints] = useState(5); // default points per completion

  const fee = calcFee('QUEST', null, count, points);

  // Option helpers
  const addOption    = () => setOptions((o) => [...o, { id: uid(), text: '' }]);
  const removeOption = (id: string) => setOptions((o) => o.filter((x) => x.id !== id));
  const setOption    = (id: string, text: string) =>
    setOptions((o) => o.map((x) => (x.id === id ? { ...x, text } : x)));

  // Need a question + at least 2 filled options before saving
  const filledOptions = options.filter((o) => o.text.trim());
  const isValid = question.trim() && filledOptions.length >= 2;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      sub_task_id: uid(),
      type: 'QUEST',
      question: question.trim(),
      options: filledOptions.map((o) => o.text.trim()),
      allow_custom_answer: allowCustom,
      multiple_options_select: multiSelect,
      count,
      points,
      status: 'active',
    } as any);
  };

  return (
    <BottomSheet onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-circle-question text-white text-sm" />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Quest</p>
          <h3 className="text-sm font-extrabold text-gray-900">Add a Question</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Question text */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is the capital of France?"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Answer options */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Options
            </label>
            <button
              onClick={addOption}
              className="text-[10px] font-bold text-brand-600 flex items-center gap-1 hover:text-brand-700"
            >
              <i className="fa-solid fa-plus text-[9px]" /> Add Option
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => setOption(opt.id, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
                {/* Can only remove if there are more than 2 options */}
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(opt.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    aria-label="Remove option"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Behaviour toggles */}
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <Toggle
            label="Allow custom answer"
            sub="Users can type their own answer"
            value={allowCustom}
            onChange={setAllowCustom}
          />
          <div className="h-px bg-gray-100" />
          <Toggle
            label="Multi-select options"
            sub="Users can pick more than one option"
            value={multiSelect}
            onChange={setMultiSelect}
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
          label="Number of responses"
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
          disabled={!isValid}
          onClick={handleSave}
          className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-xs transition-all"
        >
          Add Quest
        </button>
      </div>
    </BottomSheet>
  );
};

export default QuestForm;
