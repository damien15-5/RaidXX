/**
 * TaskUpload.tsx
 * --------------
 * Page: /task/upload
 *
 * Lets a user build a task bundle by chaining social tasks and quests.
 * When "Post" is tapped, the final payload is logged to the console
 * (no backend call yet — wire up Supabase when ready).
 *
 * ── State managed here ───────────────────────────────────────────────────────
 *   subTasks  → the ordered list of sub-tasks the user has added
 *   sheet     → which bottom sheet is currently open (or 'none')
 *   posting   → loading state while "posting"
 *   toast     → top notification message
 *
 * ── Components (edit in their own files) ─────────────────────────────────────
 *   TypeSelector   → choose Social or Quest
 *   SocialPicker   → pick which social task type
 *   SocialForm     → configure the social task
 *   QuestForm      → configure the quest
 *   SubTaskCard    → one card in the thread
 *   PricingCard    → pricing reference grid
 */

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { SubTask, SocialTaskName } from '../../components/tasks/types';
import { fmtPts } from '../../components/tasks/pricing';

// Upload-specific components
import TypeSelector from '../../components/tasks/upload/TypeSelector';
import SocialPicker from '../../components/tasks/upload/SocialPicker';
import SocialForm from '../../components/tasks/upload/SocialForm';
import QuestForm from '../../components/tasks/upload/QuestForm';
import SubTaskCard from '../../components/tasks/upload/SubTaskCard';
import PricingCard from '../../components/tasks/upload/PricingCard';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const FN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// ── Sheet state type ──────────────────────────────────────────────────────────
// Tracks which sheet is open and with what context.
type SheetState =
  | 'none' // no sheet open
  | 'type-select' // choose Social or Quest
  | 'social-pick' // pick social task type
  | { form: 'social'; taskName: SocialTaskName } // configure social task
  | { form: 'quest' }; // configure quest

// RaidX logo (reused from Wallet header)
const RaidXLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
    </svg>
  </div>
);

const TaskUpload = () => {
  const { publicKey } = useWallet();
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [sheet, setSheet] = useState<SheetState>('none');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // Total PTS fee across all sub-tasks
  const totalFee = subTasks.reduce(
    (acc, t: any) => acc + (t.points || 5) * t.count,
    0,
  );

  // Toast helper
  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3550);
  };

  // Add / remove sub-tasks
  const addTask = useCallback((t: SubTask) => { setSubTasks((prev) => [...prev, t]); setSheet('none'); }, []);
  const removeTask = useCallback((id: string) => { setSubTasks((prev) => prev.filter((t) => t.sub_task_id !== id)); }, []);

  // Post the bundle
  const handlePost = async () => {
    if (!publicKey) {
      showToast('Please connect your wallet first.', false);
      return;
    }
    if (subTasks.length === 0) {
      showToast('Add at least one task first.', false);
      return;
    }

    setPosting(true);

    try {
      const response = await fetch(`${FN_BASE}/tasks`, {
        method: 'POST',
        headers: FN_HEADERS,
        body: JSON.stringify({
          wallet: publicKey.toString(),
          action: 'create',
          tasks_data: subTasks,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showToast(`Bundle posted! ${subTasks.length} sub-task${subTasks.length > 1 ? 's' : ''} · ${fmtPts(totalFee)} PTS (unactivated)`);
        setSubTasks([]);
      } else {
        showToast(result.message || 'Failed to post task bundle.', false);
      }
    } catch (err: any) {
      console.error('Error posting task bundle:', err);
      showToast(err.message || 'A network error occurred.', false);
    } finally {
      setPosting(false);
    }
  };

  return (
    // pb-44 gives room for: action bar (~60px) + navbar (~72px) + breathing space
    <div className="min-h-screen bg-surface pb-44">

      {/* Toast notification */}
      {toast && (
        <div className={`
          fixed top-16 right-4 left-4 z-50 flex items-center gap-3
          px-4 py-3 rounded-2xl shadow-xl border
          animate-[slideIn_0.3s_ease-out]
          ${toast.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
            : 'bg-red-500/10 border-red-500/20 text-red-600'}
        `}>
          <i className={`fa-solid ${toast.ok ? 'fa-circle-check' : 'fa-circle-xmark'} text-base`} />
          <span className="text-xs font-semibold flex-1">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <RaidXLogo />
            <h1 className="text-base font-extrabold text-gray-900">Create Bundle</h1>
          </div>
          {/* Item count badge */}
          {subTasks.length > 0 && (
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
              {subTasks.length} item{subTasks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Page content */}
      <div className="pt-16 px-4">

        {/* Intro hero card */}
        <div className="mt-4 rounded-2xl bg-blue-400 p-4 text-white shadow-lg shadow-brand-500/20">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Task Bundle</p>
          <p className="text-sm font-extrabold leading-snug">
            Build a thread of tasks &amp; quests<br />
            users complete in sequence
          </p>
          <div className="mt-3 flex items-center gap-4 text-[10px] font-bold opacity-80">
            <span><i className="fa-solid fa-users mr-1" />Orders: min 1 · max 1M</span>
            <span><i className="fa-solid fa-coins mr-1" />Paid in PTS</span>
          </div>
        </div>

        {/* Pricing reference */}
        <PricingCard />

        {/* Task thread */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Task Thread
            </p>
            {subTasks.length > 0 && (
              <button
                onClick={() => setSubTasks([])}
                className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {subTasks.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <i className="fa-solid fa-layer-group text-gray-300 text-xl" />
              </div>
              <p className="text-xs font-bold text-gray-400">No tasks yet</p>
              <p className="text-[10px] text-gray-300 mt-1">Tap + to add your first task or quest</p>
            </div>
          ) : (
            // Thread list
            subTasks.map((t, i) => (
              <SubTaskCard
                key={t.sub_task_id}
                task={t}
                index={i}
                total={subTasks.length}
                onRemove={() => removeTask(t.sub_task_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto px-4 z-[55]">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-100 shadow-lg p-3 flex items-center gap-3">

          {/* Fee summary */}
          <div className="flex-1 min-w-0">
            {subTasks.length > 0 ? (
              <>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Fee</p>
                <p className="text-base font-extrabold text-brand-600">{fmtPts(totalFee)} PTS</p>
              </>
            ) : (
              <p className="text-xs text-gray-400 font-semibold">Add tasks to see fee</p>
            )}
          </div>

          {/* + Add button → opens TypeSelector sheet */}
          <button
            onClick={() => setSheet('type-select')}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95"
          >
            <i className="fa-solid fa-plus" /> Add
          </button>

          {/* Post button */}
          <button
            onClick={handlePost}
            disabled={subTasks.length === 0 || posting}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-95"
          >
            {posting
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> Posting…</>
              : <><i className="fa-solid fa-paper-plane" /> Post</>}
          </button>
        </div>
      </div>

      {/* Bottom sheets (rendered via portals in z-[60]/z-[70]) */}

      {/* Step 1: Choose type */}
      {sheet === 'type-select' && (
        <TypeSelector
          onSelect={(type) => setSheet(type === 'SOCIAL' ? 'social-pick' : { form: 'quest' })}
          onClose={() => setSheet('none')}
        />
      )}

      {/* Step 2a: Pick social task kind */}
      {sheet === 'social-pick' && (
        <SocialPicker
          onSelect={(name) => setSheet({ form: 'social', taskName: name })}
          onClose={() => setSheet('none')}
        />
      )}

      {/* Step 3a: Configure social task */}
      {typeof sheet === 'object' && sheet.form === 'social' && (
        <SocialForm
          taskName={sheet.taskName}
          onSave={addTask}
          onClose={() => setSheet('none')}
        />
      )}

      {/* Step 2b/3b: Configure quest */}
      {typeof sheet === 'object' && sheet.form === 'quest' && (
        <QuestForm
          onSave={addTask}
          onClose={() => setSheet('none')}
        />
      )}
    </div>
  );
};

export default TaskUpload;