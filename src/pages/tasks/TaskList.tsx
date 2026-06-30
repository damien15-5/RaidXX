import { useState } from 'react';
import type { TaskBundle } from '../../components/tasks/types';
import { MOCK_BUNDLES }   from '../../components/tasks/list/mockData';
import FilterTabs         from '../../components/tasks/list/FilterTabs';
import type { FilterTab } from '../../components/tasks/list/FilterTabs';
import BundleCard         from '../../components/tasks/list/BundleCard';
import BundleDetail       from '../../components/tasks/list/BundleDetail';

// RaidX logo (same as Wallet / TaskUpload header)
const RaidXLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
    </svg>
  </div>
);

const TaskList = () => {
  const [filter,   setFilter]   = useState<FilterTab>('all');
  const [selected, setSelected] = useState<TaskBundle | null>(null);

  // Filter bundles by status tab
  const filtered = MOCK_BUNDLES.filter(
    (b) => filter === 'all' || b.status === filter,
  );

  const activeCount = MOCK_BUNDLES.filter((b) => b.status === 'active').length;

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

          {/* Filter tabs — edit FilterTabs.tsx to add/remove tabs */}
          <div className="pb-3">
            <FilterTabs current={filter} onChange={setFilter} />
          </div>
        </div>
      </header>

      {/* Bundle list  */}
      {/* pt-28 clears the fixed header (title + tabs) */}
      <div className="pt-28 px-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
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

      {/* Detail sheet — opens over everything including the navbar */}
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