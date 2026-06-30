/**
 * FilterTabs.tsx
 * --------------
 * All / Active / Submitted filter tabs for the TaskList page.
 * The active tab is highlighted in brand colour.
 */

export type FilterTab = 'all' | 'active' | 'submitted';

interface FilterTabsProps {
  current: FilterTab;
  onChange: (tab: FilterTab) => void;
}

const TABS: FilterTab[] = ['all', 'active', 'submitted'];

const FilterTabs = ({ current, onChange }: FilterTabsProps) => (
  <div className="flex gap-1">
    {TABS.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`
          flex-1 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all
          ${current === tab
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
            : 'bg-gray-100 text-gray-400 hover:text-gray-600'}
        `}
      >
        {tab}
      </button>
    ))}
  </div>
);

export default FilterTabs;
