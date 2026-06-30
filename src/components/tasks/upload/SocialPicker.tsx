
import type { SocialTaskName } from '../types';
import { SOCIAL_TASKS, SOCIAL_PRICE_PER_1K, fmtPts } from '../pricing';
import BottomSheet from '../BottomSheet';

interface SocialPickerProps {
  onSelect: (name: SocialTaskName) => void;
  onClose: () => void;
}

const SocialPicker = ({ onSelect, onClose }: SocialPickerProps) => (
  <BottomSheet onClose={onClose}>
    <h3 className="text-base font-extrabold text-gray-900 mb-1">Choose Social Task</h3>
    <p className="text-xs text-gray-400 mb-5">
      Select the action you want users to perform
    </p>

    <div className="flex flex-col gap-2">
      {SOCIAL_TASKS.map((t) => (
        <button
          key={t.name}
          onClick={() => onSelect(t.name)}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-brand-500/40 hover:bg-brand-50/40 transition-all group"
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
            <i className={`fa-solid ${t.icon} text-sky-500 text-sm`} />
          </div>

          {/* Label + price */}
          <div className="text-left flex-1">
            <p className="text-xs font-bold text-gray-900">{t.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fmtPts(SOCIAL_PRICE_PER_1K[t.name])} PTS / 1k orders
            </p>
          </div>

          <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
        </button>
      ))}
    </div>
  </BottomSheet>
);

export default SocialPicker;
