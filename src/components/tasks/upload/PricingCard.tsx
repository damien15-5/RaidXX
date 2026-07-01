const PricingCard = () => (
  <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
      Self-Serve Ad Network Fees
    </p>
    <div className="text-xs text-gray-600 font-semibold leading-relaxed">
      You define the reward points for each task completion individually (minimum <span className="font-bold text-brand-600">5 PTS</span>). 
      The total cost is calculated as:
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mt-2 font-mono text-[11px] text-slate-800 text-center font-bold">
        Points per completion × Solver count
      </div>
      <p className="text-[10px] text-gray-400 mt-2 font-medium">
        10,000 PTS equals 1.0 SOL. Incomplete/cancelled tasks will be refunded directly back to your balance.
      </p>
    </div>
  </div>
);

export default PricingCard;
