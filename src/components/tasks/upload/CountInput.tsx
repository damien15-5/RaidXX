/**
 * CountInput.tsx
 * --------------
 * Stepper input for order count (- / input field / +).
 * Min: 1  |  Max: 1,000,000
 * Shows the calculated fee below the stepper.
 */

import { clampCount, fmtPts } from '../pricing';

interface CountInputProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  fee: number; // already-calculated fee in PTS
  rateLabel: string; // e.g. "500 PTS / 1k"
}

const CountInput = ({ label, value, onChange, fee, rateLabel }: CountInputProps) => {
  // Step size increases as the count gets larger
  const step = value >= 1000 ? 500 : value >= 100 ? 50 : 10;

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] text-gray-400">{rateLabel}</span>
      </div>

      {/* - / input / + */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, value - step))}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 transition-all font-bold"
        >
          <i className="fa-solid fa-minus text-xs" />
        </button>

        <input
          type="number"
          min={1}
          max={1_000_000}
          value={value}
          onChange={(e) => onChange(clampCount(e.target.value))}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-extrabold text-center focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
        />

        <button
          onClick={() => onChange(Math.min(1_000_000, value + step))}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 transition-all font-bold"
        >
          <i className="fa-solid fa-plus text-xs" />
        </button>
      </div>

      {/* Fee / limits row */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">Min: 1 · Max: 1M</span>
        <span className="text-[10px] font-bold text-brand-600">
          {fmtPts(fee)} PTS fee
        </span>
      </div>
    </div>
  );
};

export default CountInput;
