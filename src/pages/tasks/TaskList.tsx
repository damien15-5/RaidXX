import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { TaskBundle } from '../../components/tasks/types';
import FilterTabs         from '../../components/tasks/list/FilterTabs';
import type { FilterTab } from '../../components/tasks/list/FilterTabs';
import BundleCard         from '../../components/tasks/list/BundleCard';
import BundleDetail       from '../../components/tasks/list/BundleDetail';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const FN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// RaidX logo (same as Wallet / TaskUpload header)
const RaidXLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
    </svg>
  </div>
);

const TaskList = () => {
  const { publicKey } = useWallet();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selected, setSelected] = useState<TaskBundle | null>(null);
  const [bundles, setBundles] = useState<TaskBundle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const walletParam = publicKey ? `?wallet=${publicKey.toString()}` : '';
      const res = await fetch(`${FN_BASE}/tasks${walletParam}`, { headers: FN_HEADERS });
      const data = await res.json();
      if (data.success) {
        const mapped = (data.tasks || []).map((t: any) => {
          const totalSubTasks = t.tasks_data?.length || 0;
          const userSubmits = t.user_submissions?.length || 0;
          
          // Move from active to submitted locally if the user has completed all tasks
          const localStatus = (totalSubTasks > 0 && userSubmits === totalSubTasks)
            ? 'submitted'
            : (t.status === 'completed' ? 'submitted' : t.status);

          return {
            bundle_id: t.id,
            posted_by: t.posted_by || 'Unknown',
            status: localStatus,
            created_at: t.created_at,
            tasks_data: t.tasks_data,
            user_submissions: t.user_submissions || [],
            activated: t.activated,
            cancelled: t.cancelled
          };
        });
        setBundles(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  // Filter bundles by status tab
  const filtered = bundles.filter(
    (b) => filter === 'all' || b.status === filter,
  );

  const activeCount = bundles.filter((b) => b.status === 'active').length;

  return (
    <div className="min-h-screen bg-surface pb-24">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-0">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RaidXLogo />
              <h1 className="text-base font-extrabold text-gray-900">Task Bundles</h1>
            </div>
            {/* Active count badge */}
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {activeCount} active
            </span>
          </div>

          {/* Filter tabs */}
          <div className="pb-3">
            <FilterTabs current={filter} onChange={setFilter} />
          </div>
        </div>
      </header>

      {/* Bundle list */}
      <div className="pt-28 px-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin mb-3"></div>
            <p className="text-xs font-semibold text-gray-400">Loading bundles...</p>
          </div>
        ) : filtered.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <i className="fa-solid fa-list-check text-gray-300 text-2xl" />
            </div>
            <p className="text-sm font-bold text-gray-400">No bundles found</p>
            <p className="text-[11px] text-gray-300 mt-1">Try a different filter</p>
          </div>
        ) : (
          filtered.map((bundle) => (
            <BundleCard
              key={bundle.bundle_id}
              bundle={bundle}
              onClick={() => setSelected(bundle)}
            />
          ))
        )}
      </div>

      {/* Detail sheet */}
      {selected && (
        <BundleDetail
          bundle={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default TaskList;