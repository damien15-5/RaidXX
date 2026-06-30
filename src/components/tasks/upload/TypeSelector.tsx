/**
 * TypeSelector.tsx
 * ----------------
 * First sheet shown when the user taps "+ Add".
 * Lets the user choose between a Social Task or a Quest.
 */

import BottomSheet from '../BottomSheet';

interface TypeSelectorProps {
  onSelect: (type: 'SOCIAL' | 'QUEST') => void;
  onClose: () => void;
}

const TypeSelector = ({ onSelect, onClose }: TypeSelectorProps) => (
  <BottomSheet onClose={onClose}>
    <h3 className="text-base font-extrabold text-gray-900 mb-1">Add Sub-Task</h3>
    <p className="text-xs text-gray-400 mb-5">What type would you like to add?</p>

    <div className="flex flex-col gap-3">
      {/* Social Task option */}
      <button
        onClick={() => onSelect('SOCIAL')}
        className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-brand-500/40 hover:bg-brand-50/40 transition-all group"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <i className="fa-brands fa-x-twitter text-white text-base" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
            Social Task
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Follow, Retweet, Comment, Tweet, Quote
          </p>
        </div>
        <i className="fa-solid fa-chevron-right text-gray-300 ml-auto text-xs" />
      </button>

      {/* Quest option */}
      <button
        onClick={() => onSelect('QUEST')}
        className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-brand-500/40 hover:bg-brand-50/40 transition-all group"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
          <i className="fa-solid fa-circle-question text-white text-base" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
            Quest
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Multiple-choice question for users to answer
          </p>
        </div>
        <i className="fa-solid fa-chevron-right text-gray-300 ml-auto text-xs" />
      </button>
    </div>
  </BottomSheet>
);

export default TypeSelector;
