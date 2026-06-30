import { SOCIAL_TASKS, SOCIAL_PRICE_PER_1K, QUEST_PRICE_PER_1K, fmtPts } from '../pricing';

const PricingCard = () => (
  <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
      Pricing (per 1k orders)
    </p>

    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
      {/* Social task prices */}
      {SOCIAL_TASKS.map((t) => (
        <div key={t.name} className="flex items-center gap-2">
          <i className={`fa-solid ${t.icon} text-[10px] text-sky-400 w-3`} />
          <span className="text-[10px] text-gray-600 font-semibold truncate">
            {/* Strip " X " from label for brevity */}
            {t.label.replace(' X ', ' ')}
          </span>
          <span className="ml-auto text-[10px] font-bold text-sky-500 shrink-0">
            {fmtPts(SOCIAL_PRICE_PER_1K[t.name])}
          </span>
        </div>
      ))}

      {/* Quest price */}
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-circle-question text-[10px] text-violet-400 w-3" />
        <span className="text-[10px] text-gray-600 font-semibold">Quest</span>
        <span className="ml-auto text-[10px] font-bold text-brand-600">
          {fmtPts(QUEST_PRICE_PER_1K)}
        </span>
      </div>
    </div>
  </div>
);

export default PricingCard;
