import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { TaskBundle, SocialSubTask, QuestSubTask, SubTask } from '../types';
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const FN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

interface BundleDetailProps {
  bundle: TaskBundle;
  onClose: () => void;
}

const BundleDetail = ({ bundle, onClose }: BundleDetailProps) => {
  const { publicKey } = useWallet();
  const isActive = bundle.status === 'active';

  // Completion Wizard States
  const [isCompleting, setIsCompleting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Inputs
  const [username, setUsername] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState('');

  const currentTask: SubTask | undefined = bundle.tasks_data[stepIndex];

  const handleOptionToggle = (option: string, isMulti: boolean) => {
    if (isMulti) {
      setSelectedOptions(prev =>
        prev.includes(option)
          ? prev.filter(o => o !== option)
          : [...prev, option]
      );
    } else {
      setSelectedOptions([option]);
    }
  };

  const findNextIncompleteIndex = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < bundle.tasks_data.length; i++) {
      const task = bundle.tasks_data[i];
      const subStatus = bundle.user_submissions?.find(s => s.sub_task_id === task.sub_task_id)?.status;
      if (subStatus !== 'successful' && subStatus !== 'pending') {
        return i;
      }
    }
    return -1;
  };

  const handleStart = () => {
    if (!publicKey) {
      setErrorMsg('Please connect your wallet first.');
      return;
    }

    // Find the first incomplete/unsubmitted task index
    const firstIncompleteIdx = bundle.tasks_data.findIndex((task) => {
      const subStatus = bundle.user_submissions?.find(s => s.sub_task_id === task.sub_task_id)?.status;
      return subStatus !== 'successful' && subStatus !== 'pending';
    });

    if (firstIncompleteIdx === -1) {
      setErrorMsg('You have already submitted all tasks in this bundle.');
      return;
    }

    setIsCompleting(true);
    setStepIndex(firstIncompleteIdx);
    setErrorMsg(null);
    setSuccessMsg(null);
    clearInputs();
  };

  const clearInputs = () => {
    setUsername('');
    setProofUrl('');
    setSelectedOptions([]);
    setCustomAnswer('');
  };

  const handleNextSubmit = async () => {
    if (!publicKey || !currentTask) return;

    setLoading(true);
    setErrorMsg(null);

    // Validate inputs
    let proof_data: any = {};
    if (currentTask.type === 'SOCIAL') {
      if (!username.trim()) {
        setErrorMsg('X / Twitter username is required.');
        setLoading(false);
        return;
      }
      if (!proofUrl.trim()) {
        setErrorMsg('Screenshot URL / Proof Link is required.');
        setLoading(false);
        return;
      }
      proof_data = {
        username: username.trim().replace(/^@/, ''),
        proof_url: proofUrl.trim(),
      };
    } else {
      // QUEST
      const q = currentTask as QuestSubTask;
      const hasSelected = selectedOptions.length > 0;
      const hasCustom = customAnswer.trim().length > 0;

      if (!hasSelected && !hasCustom) {
        setErrorMsg('Please select an option or write a custom answer.');
        setLoading(false);
        return;
      }

      proof_data = {
        answer: hasCustom 
          ? customAnswer.trim() 
          : (q.multiple_options_select ? selectedOptions.join(', ') : selectedOptions[0])
      };
    }

    try {
      const res = await fetch(`${FN_BASE}/tasks-submit`, {
        method: 'POST',
        headers: FN_HEADERS,
        body: JSON.stringify({
          wallet: publicKey.toString(),
          parent_task_id: bundle.bundle_id,
          sub_task_id: currentTask.sub_task_id,
          proof_data,
        }),
      });

      const data = await res.json();
      if (data.success) {
        clearInputs();
        const nextIdx = findNextIncompleteIndex(stepIndex);
        if (nextIdx !== -1) {
          // Advance to next subtask
          setStepIndex(nextIdx);
        } else {
          // Finished all subtasks
          setSuccessMsg('Successfully submitted all tasks! Verification is pending.');
        }
      } else {
        setErrorMsg(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet onClose={onClose}>
      {/* ── Header: Title & Close ── */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
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
          <p className="text-[10px] text-gray-400 font-mono block">Creator: {bundle.posted_by.slice(0, 8)}...{bundle.posted_by.slice(-6)}</p>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-gray-500 text-sm" />
        </button>
      </div>

      {/* Error / Success Banners */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex gap-2 items-start animate-[slideIn_0.2s_ease-out]">
          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-center flex flex-col items-center justify-center animate-[popIn_0.3s_ease-out]">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20 text-lg">
            <i className="fa-solid fa-check" />
          </div>
          <p className="text-sm font-bold">{successMsg}</p>
          <p className="text-xs text-emerald-600/80 mt-1">Rewards will be credited automatically upon approval.</p>
          <button
            onClick={onClose}
            className="mt-5 px-6 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all"
          >
            Done
          </button>
        </div>
      )}

      {/* ── Wizard Mode ── */}
      {isCompleting && !successMsg && currentTask && (
        <div className="animate-[fadeIn_0.25s_ease-out]">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold text-brand-600 uppercase bg-brand-50 px-2 py-0.5 rounded-md">
              Task {stepIndex + 1} of {bundle.tasks_data.length}
            </span>
            <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-500 to-blue-400 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / bundle.tasks_data.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {Math.round(((stepIndex + 1) / bundle.tasks_data.length) * 100)}%
            </span>
          </div>

          {/* Subtask Card */}
          {(() => {
            const isSocial = currentTask.type === 'SOCIAL';
            const meta = isSocial ? SOCIAL_META[(currentTask as SocialSubTask).task_name] : null;

            return (
              <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm mb-4">
                {/* Meta details */}
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSocial ? 'bg-gradient-to-br from-sky-400 to-blue-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'
                  }`}>
                    <i className={`fa-solid ${isSocial ? meta?.icon : 'fa-circle-question'} text-white text-xs`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{isSocial ? meta?.label : 'Quest / Quiz'}</h4>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">{currentTask.type}</p>
                  </div>
                </div>

                {/* Subtask Body */}
                {isSocial ? (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Perform the action at the target link below:</p>
                    <a
                      href={(currentTask as SocialSubTask).target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 font-bold bg-brand-50/50 border border-brand-100 rounded-xl py-2 px-3 block text-center truncate hover:underline"
                    >
                      <i className="fa-brands fa-twitter mr-1.5 text-sky-500" />
                      Open Link on X / Twitter <i className="fa-solid fa-arrow-up-right-from-square text-[9px] ml-0.5" />
                    </a>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-800 bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100/50">
                      {((currentTask as QuestSubTask).question)}
                    </p>
                    
                    {/* Options list */}
                    <div className="flex flex-col gap-2">
                      {(currentTask as QuestSubTask).options.map((opt, i) => {
                        const isSelected = selectedOptions.includes(opt);
                        const isMulti = (currentTask as QuestSubTask).multiple_options_select;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleOptionToggle(opt, isMulti)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm shadow-brand-500/5'
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 text-[8px] font-bold ${
                              isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 text-gray-400'
                            }`}>
                              {isSelected ? <i className="fa-solid fa-check" /> : String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}

                      {/* Custom answer input if allowed */}
                      {(currentTask as QuestSubTask).allow_custom_answer && (
                        <div className="mt-1">
                          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                            Or Write Custom Answer:
                          </label>
                          <textarea
                            value={customAnswer}
                            onChange={(e) => setCustomAnswer(e.target.value)}
                            placeholder="Type your custom answer here..."
                            rows={2}
                            className="w-full text-xs border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subtask Inputs (Social Tasks) */}
                {isSocial && (
                  <div className="flex flex-col gap-3 border-t border-gray-50 pt-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                        Your X / Twitter Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-semibold">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="elonmusk"
                          className="w-full text-xs border border-gray-100 rounded-xl pl-7 pr-3 py-2.5 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                        Proof Link / Screenshot URL
                      </label>
                      <input
                        type="url"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="Paste screenshot URL or post link..."
                        className="w-full text-xs border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsCompleting(false)}
              disabled={loading}
              className="flex-1 py-3 border border-gray-100 hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleNextSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 text-white text-xs font-bold rounded-xl shadow-sm shadow-brand-500/10 transition-all flex items-center justify-center gap-1.5 active:scale-95 animate-[popIn_0.2s_ease-out]"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {stepIndex === bundle.tasks_data.length - 1 ? 'Finish & Submit' : 'Next Task'}
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── View Thread Mode (Static Overview before starting) ── */}
      {!isCompleting && !successMsg && (
        <>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">
            Task Thread Details
          </p>

          <div className="max-h-[300px] overflow-y-auto pr-1">
            {bundle.tasks_data.map((task, idx) => {
              const isSocial = task.type === 'SOCIAL';
              const meta     = isSocial ? SOCIAL_META[(task as SocialSubTask).task_name] : null;
              const isLast   = idx === bundle.tasks_data.length - 1;

              // Find current user's subtask submission status
              const subSubmission = bundle.user_submissions?.find(s => s.sub_task_id === task.sub_task_id);
              const status = subSubmission?.status;

              return (
                <div key={task.sub_task_id} className="relative pl-7 mb-3">
                  {!isLast && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />
                  )}

                  <div className={`
                    absolute left-[5px] top-3.5 w-3 h-3 rounded-full border-2
                    ${isSocial ? 'border-sky-400 bg-sky-50' : 'border-violet-400 bg-violet-50'}
                  `} />

                  <div className={`
                    rounded-2xl border p-3 transition-all
                    ${isSocial ? 'border-gray-100 bg-white' : 'border-violet-50 bg-violet-50/20'}
                  `}>
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-7 h-7 rounded-xl flex items-center justify-center shrink-0
                        ${isSocial
                          ? 'bg-gradient-to-br from-sky-400 to-blue-500'
                          : 'bg-gradient-to-br from-violet-400 to-purple-600'}
                      `}>
                        <i className={`fa-solid ${isSocial ? meta?.icon : 'fa-circle-question'} text-white text-[10px]`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-tight flex items-center gap-1.5 flex-wrap">
                          <span>{isSocial ? meta?.label : 'Quest'}</span>
                          {/* Submission Status Badges */}
                          {status === 'pending' && (
                            <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                              Pending
                            </span>
                          )}
                          {status === 'successful' && (
                            <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                              Approved
                            </span>
                          )}
                          {status === 'failed' && (
                            <span className="text-[8px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                              Rejected
                            </span>
                          )}
                        </p>
                        <p className="text-[9px] text-gray-400">{task.type}</p>
                      </div>
                      <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full shrink-0">
                        ×{fmtCount(task.count)}
                      </span>
                    </div>

                    {isSocial && (
                      <p className="text-[10px] text-gray-400 truncate mt-1.5 break-all">
                        {(task as SocialSubTask).target_url}
                      </p>
                    )}

                    {!isSocial && (
                      <p className="text-[10px] text-gray-600 font-semibold mt-1.5 line-clamp-1">
                        {(task as QuestSubTask).question}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Start Tasks CTA — only for active bundles */}
          {isActive && (
            <button
              onClick={handleStart}
              className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-brand-500/20 active:scale-98 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-bolt" />
              {bundle.user_submissions && bundle.user_submissions.length > 0 ? 'Continue Tasks' : 'Start Tasks'}
            </button>
          )}
        </>
      )}
    </BottomSheet>
  );
};

export default BundleDetail;
