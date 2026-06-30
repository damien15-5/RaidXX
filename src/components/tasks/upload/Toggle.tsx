/**
 * Toggle.tsx
 * ----------
 * Simple on/off toggle switch.
 * Used inside QuestForm for "allow custom answer" and "multi-select" options.
 */

interface ToggleProps {
  label: string;
  sub: string; // short description shown below the label
  value: boolean;
  onChange: (v: boolean) => void;
}

const Toggle = ({ label, sub, value, onChange }: ToggleProps) => (
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>

    {/* Pill toggle */}
    <button
      onClick={() => onChange(!value)}
      className={`
        relative w-9 h-5 rounded-full transition-colors shrink-0
        ${value ? 'bg-brand-500' : 'bg-gray-200'}
      `}
    >
      <span className={`
        absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm
        transition-transform ${value ? 'translate-x-4' : ''}
      `} />
    </button>
  </div>
);

export default Toggle;
