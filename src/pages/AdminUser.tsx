import { useState, useEffect, useCallback } from 'react';
import { fetchAdminStats, verifySubmissionServerless, type AdminStats } from '../api/admin';

type TabName = 'submissions' | 'users' | 'tasks' | 'deposits' | 'withdrawals' | 'faucet';

const AdminUser = () => {
  const [stats, setStats] = useState<AdminStats>({
    users: [],
    tasks: [],
    transactions: [],
    submissions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('submissions');
  const [subFilter, setSubFilter] = useState<'pending' | 'verified'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoadingGroup, setBulkLoadingGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load admin stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerify = async (recordId: string, status: 'successful' | 'failed') => {
    setActionLoadingId(recordId);
    try {
      const res = await verifySubmissionServerless(recordId, status);
      if (res.success) {
        showToast(
          status === 'successful'
            ? `Approved successfully! Solver rewarded.`
            : 'Submission rejected successfully.'
        );
        // Refresh local stats
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyAll = async (groupKey: string, recordIds: string[], status: 'successful' | 'failed') => {
    setBulkLoadingGroup(groupKey);
    try {
      const promises = recordIds.map(id => verifySubmissionServerless(id, status));
      await Promise.all(promises);
      showToast(
        status === 'successful'
          ? `Approved all ${recordIds.length} submissions in this bundle!`
          : `Rejected all ${recordIds.length} submissions in this bundle.`
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Bulk action failed.', 'error');
    } finally {
      setBulkLoadingGroup(null);
    }
  };

  // ── Filters & Search ────────────────────────────────────────────────────────
  const filterBySearch = (val: string) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return val.toLowerCase().includes(query);
  };

  // Filter Submissions
  const filteredSubmissions = stats.submissions.filter((sub) => {
    const matchesFilter =
      subFilter === 'pending'
        ? sub.status === 'pending'
        : sub.status === 'successful' || sub.status === 'failed';

    const matchesSearch =
      filterBySearch(sub.wallet_address) ||
      filterBySearch(sub.sub_task_id) ||
      filterBySearch(sub.sub_task?.type || '') ||
      filterBySearch(sub.sub_task?.task_name || '') ||
      filterBySearch(sub.proof_data?.username || '') ||
      filterBySearch(sub.proof_data?.answer || '') ||
      filterBySearch(sub.proof_data?.proof_url || '');

    return matchesFilter && matchesSearch;
  });

  // Filter Users
  const filteredUsers = stats.users.filter((u) =>
    filterBySearch(u.wallet_address)
  );

  // Filter Tasks
  const filteredTasks = stats.tasks.filter((t) =>
    filterBySearch(t.id) || filterBySearch(t.posted_by) || filterBySearch(t.status)
  );

  // Filter Transactions by Type
  const deposits = stats.transactions.filter((tx) => tx.type === 'deposit');
  const withdrawals = stats.transactions.filter((tx) => tx.type === 'withdrawal');
  const faucets = stats.transactions.filter((tx) => tx.type === 'faucet');

  const filteredDeposits = deposits.filter((tx) =>
    filterBySearch(tx.wallet_address) || filterBySearch(tx.signature)
  );

  const filteredWithdrawals = withdrawals.filter((tx) =>
    filterBySearch(tx.wallet_address) || filterBySearch(tx.signature)
  );

  const filteredFaucets = faucets.filter((tx) =>
    filterBySearch(tx.wallet_address) || filterBySearch(tx.signature)
  );

  // Aggregate stats
  const totalDepositVolume = deposits
    .filter((tx) => tx.status === 'confirmed')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const totalWithdrawalVolume = withdrawals
    .filter((tx) => tx.status === 'confirmed')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const totalFaucetVolume = faucets
    .filter((tx) => tx.status === 'confirmed')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto sm:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-lg border transition-all animate-[slideIn_0.3s_ease-out] ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-100 text-red-600'
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}
        >
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'} text-base`} />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white text-base shadow-md shadow-brand-500/15">
              <i className="fa-solid fa-user-shield text-sm sm:text-base" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight">RaidX Admin Panel</h1>
              <p className="text-[9px] sm:text-[11px] text-slate-400 font-medium">Bypass RLS Management Console</p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs font-bold text-slate-600 rounded-xl"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''} text-[10px]`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">

        {/* ── Overview Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{stats.users.length}</h3>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{stats.tasks.length}</h3>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Deposits</p>
            <h3 className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">{totalDepositVolume.toFixed(2)} SOL</h3>
            <p className="text-[8px] text-slate-400 mt-0.5">{deposits.length} txs</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Withdrawals</p>
            <h3 className="text-lg sm:text-xl font-black text-rose-600 mt-0.5">{totalWithdrawalVolume.toFixed(2)} SOL</h3>
            <p className="text-[8px] text-slate-400 mt-0.5">{withdrawals.length} txs</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Faucet Claims</p>
            <h3 className="text-lg sm:text-xl font-black text-blue-600 mt-0.5">{totalFaucetVolume.toFixed(1)} SOL</h3>
            <p className="text-[8px] text-slate-400 mt-0.5">{faucets.length} claims</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-lg sm:text-xl font-black text-amber-500 mt-0.5">
              {stats.submissions.filter(s => s.status === 'pending').length}
            </h3>
          </div>
        </div>

        {/* ── Main Work Area ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* Navigation & Search Row */}
          <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Tabs (Horizontally scrollable on mobile) */}
            <div className="w-full md:w-auto overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl whitespace-nowrap min-w-max">
                {(['submissions', 'users', 'tasks', 'deposits', 'withdrawals', 'faucet'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSearchQuery('');
                    }}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-white text-brand-600 shadow-sm shadow-brand-500/5'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search input */}
            <div className="relative w-full md:w-80">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* ── Loading / Error ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-slate-400 font-semibold">Fetching serverless statistics...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 text-xl">
                <i className="fa-solid fa-circle-exclamation" />
              </div>
              <p className="text-sm font-bold text-slate-800">Connection Error</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          )}

          {/* ── Content View ── */}
          {!loading && !error && (
            <div className="p-4 sm:p-6">

              {/* 1. SUBMISSIONS TAB */}
              {activeTab === 'submissions' && (
                <div>
                  {/* Pending vs Verified toggle */}
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <button
                      onClick={() => setSubFilter('pending')}
                      className={`pb-2 px-2 text-xs font-bold relative transition-all ${
                        subFilter === 'pending' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Unverified ({stats.submissions.filter(s => s.status === 'pending').length})
                      {subFilter === 'pending' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
                    </button>
                    <button
                      onClick={() => setSubFilter('verified')}
                      className={`pb-2 px-2 text-xs font-bold relative transition-all ${
                        subFilter === 'verified' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Verified ({stats.submissions.filter(s => s.status !== 'pending').length})
                      {subFilter === 'verified' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
                    </button>
                  </div>

                  {(() => {
                    const groupedSubmissions: {
                      key: string;
                      wallet_address: string;
                      parent_task_id: string;
                      submissions: typeof filteredSubmissions;
                      pendingCount: number;
                      pendingIds: string[];
                    }[] = [];

                    filteredSubmissions.forEach((sub) => {
                      const key = `${sub.wallet_address}_${sub.parent_task_id}`;
                      let group = groupedSubmissions.find((g) => g.key === key);
                      if (!group) {
                        group = {
                          key,
                          wallet_address: sub.wallet_address,
                          parent_task_id: sub.parent_task_id || 'Unknown',
                          submissions: [],
                          pendingCount: 0,
                          pendingIds: []
                        };
                        groupedSubmissions.push(group);
                      }
                      group.submissions.push(sub);
                      if (sub.status === 'pending') {
                        group.pendingCount++;
                        group.pendingIds.push(sub.id);
                      }
                    });

                    if (groupedSubmissions.length === 0) {
                      return (
                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-400">No submissions match the filters</p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-4">
                        {groupedSubmissions.map((group) => {
                          const isExpanded = expandedGroups.includes(group.key);
                          const hasPending = group.pendingCount > 0;
                          const isBulkLoading = bulkLoadingGroup === group.key;

                          return (
                            <div key={group.key} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all">
                              
                              {/* Group Header Info */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Solver Wallet</span>
                                    <span className="text-[8px] font-bold text-brand-600 bg-brand-50 border border-brand-100/50 px-1.5 py-0.5 rounded-full">
                                      {group.submissions.length} Tasks
                                    </span>
                                    {group.pendingCount > 0 && (
                                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                        {group.pendingCount} Pending
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-slate-800 break-all block leading-tight mb-2" title={group.wallet_address}>
                                    <span className="hidden sm:inline">{group.wallet_address}</span>
                                    <span className="inline sm:hidden">{group.wallet_address.slice(0, 8)}...{group.wallet_address.slice(-8)}</span>
                                  </span>
                                  
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                    <i className="fa-solid fa-folder text-slate-300" />
                                    <span>Bundle ID: </span>
                                    <span className="font-mono text-slate-500 font-bold">{group.parent_task_id.slice(0, 8)}...{group.parent_task_id.slice(-6)}</span>
                                  </div>
                                </div>

                                {/* Bulk Group Actions */}
                                {hasPending && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      disabled={isBulkLoading || actionLoadingId !== null}
                                      onClick={() => handleVerifyAll(group.key, group.pendingIds, 'failed')}
                                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      {isBulkLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-xmark" />}
                                      Reject All
                                    </button>
                                    <button
                                      disabled={isBulkLoading || actionLoadingId !== null}
                                      onClick={() => handleVerifyAll(group.key, group.pendingIds, 'successful')}
                                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      {isBulkLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-check" />}
                                      Approve All
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Accordion Expand Toggle */}
                              <div className="mt-3 flex items-center justify-between">
                                <button
                                  onClick={() => {
                                    setExpandedGroups(prev =>
                                      prev.includes(group.key)
                                        ? prev.filter(k => k !== group.key)
                                        : [...prev, group.key]
                                    );
                                  }}
                                  className="text-xs font-extrabold text-brand-600 hover:text-brand-700 flex items-center gap-1.5 bg-brand-50/50 hover:bg-brand-50 px-4 py-2 rounded-xl border border-brand-100/30 transition-all active:scale-95"
                                >
                                  <span>{isExpanded ? 'Hide Task Details' : `View Task Details (${group.submissions.length})`}</span>
                                  <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                                </button>
                              </div>

                              {/* Nested Submissions List */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-100/50 flex flex-col gap-4 animate-[slideDown_0.2s_ease-out]">
                                  {group.submissions.map((sub) => {
                                    const isSocial = sub.sub_task?.type === 'SOCIAL';
                                    return (
                                      <div key={sub.id} className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-100/60 pb-2">
                                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Subtask Info</span>
                                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            isSocial ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                                          }`}>
                                            {isSocial ? `X / ${sub.sub_task?.task_name}` : 'Quest / Quiz'}
                                          </span>
                                        </div>

                                        {/* Task Details */}
                                        <div className="mb-3">
                                          {isSocial ? (
                                            <div>
                                              <p className="text-xs font-bold text-slate-800">{sub.sub_task?.task_name} on X</p>
                                              <a href={sub.sub_task?.target_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-600 hover:underline font-semibold truncate block mt-0.5">
                                                {sub.sub_task?.target_url} <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                                              </a>
                                            </div>
                                          ) : (
                                            <div>
                                              <p className="text-xs font-semibold text-slate-800">{sub.sub_task?.question}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* User Proof Submission */}
                                        <div className="bg-white border border-slate-100 p-3 rounded-xl mb-4">
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">User Submission Proof</span>
                                          {isSocial ? (
                                            <div className="flex flex-col gap-2">
                                              {sub.proof_data?.username && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                  <i className="fa-brands fa-twitter text-sky-400" />
                                                  <span className="font-bold">@ {sub.proof_data.username}</span>
                                                </div>
                                              )}
                                              {sub.proof_data?.proof_url && (
                                                <div>
                                                  <a
                                                    href={sub.proof_data.proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-brand-600 hover:underline font-semibold flex items-center gap-1"
                                                  >
                                                    <i className="fa-solid fa-link text-[10px]" /> View Screenshot / Link
                                                  </a>
                                                  {/\.(jpeg|jpg|gif|png|webp)/i.test(sub.proof_data.proof_url) && (
                                                    <div className="mt-2 border border-slate-200/50 rounded-xl overflow-hidden max-h-32 bg-black/5 flex items-center justify-center">
                                                      <img
                                                        src={sub.proof_data.proof_url}
                                                        alt="Proof Screenshot"
                                                        className="object-contain max-h-32 w-full"
                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-slate-700">
                                              <span className="text-slate-400 font-medium">Answer Given: </span>
                                              <span className="font-bold">{sub.proof_data?.answer || 'No answer provided'}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Individual Verification Action */}
                                        {sub.status === 'pending' ? (
                                          <div className="flex gap-2">
                                            <button
                                              disabled={actionLoadingId !== null || isBulkLoading}
                                              onClick={() => handleVerify(sub.id, 'failed')}
                                              className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                            >
                                              {actionLoadingId === sub.id ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-solid fa-xmark" /> Reject</>}
                                            </button>
                                            <button
                                              disabled={actionLoadingId !== null || isBulkLoading}
                                              onClick={() => handleVerify(sub.id, 'successful')}
                                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                                            >
                                              {actionLoadingId === sub.id ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-solid fa-check" /> Approve</>}
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between pt-1 text-xs font-bold">
                                            <span className="text-slate-400">Status</span>
                                            <span className={`capitalize ${
                                              sub.status === 'successful' ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'
                                            }`}>
                                              {sub.status === 'successful' ? 'Approved ✓' : 'Rejected ✗'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 2. USERS TAB */}
              {activeTab === 'users' && (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-3">Wallet Address</th>
                        <th className="pb-3">SOL Balance</th>
                        <th className="pb-3">Points</th>
                        <th className="pb-3">Registered At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-700 break-all" title={u.wallet_address}>
                            <span className="hidden md:inline">{u.wallet_address}</span>
                            <span className="inline md:hidden">{u.wallet_address.slice(0, 8)}...{u.wallet_address.slice(-8)}</span>
                          </td>
                          <td className="py-3.5 font-bold text-slate-900">{Number(u.sol_balance).toFixed(4)} SOL</td>
                          <td className="py-3.5 font-bold text-brand-600">{Number(u.points).toLocaleString()} PTS</td>
                          <td className="py-3.5 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. TASKS TAB */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  {filteredTasks.map((t) => (
                    <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <div className="flex items-start justify-between border-b border-slate-50 pb-3 mb-3 gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Bundle ID</span>
                          <span className="text-xs font-mono font-bold text-slate-700 break-all block leading-tight">{t.id}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            t.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-[9px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 mb-3">
                        <span className="text-slate-400 font-medium">Posted By:</span>{' '}
                        <span className="font-mono font-bold text-slate-700 break-all" title={t.posted_by}>
                          {t.posted_by.slice(0, 8)}...{t.posted_by.slice(-8)}
                        </span>
                      </div>

                      {/* Display subtasks inside this bundle */}
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Sub-tasks</span>
                        {t.tasks_data.map((sub: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200/40 text-xs">
                            <span className="font-bold text-slate-700">
                              {sub.type === 'SOCIAL' ? `${sub.task_name} on X` : 'Quest'}
                            </span>
                            <span className="text-[10px] text-slate-400">Limit: {sub.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. DEPOSITS TAB */}
              {activeTab === 'deposits' && (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-3">Wallet Address</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Points Granted</th>
                        <th className="pb-3">Signature</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeposits.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-700 break-all" title={tx.wallet_address}>
                            <span className="hidden md:inline">{tx.wallet_address}</span>
                            <span className="inline md:hidden">{tx.wallet_address.slice(0, 8)}...{tx.wallet_address.slice(-8)}</span>
                          </td>
                          <td className="py-3.5 font-bold text-emerald-600">+{Number(tx.amount).toFixed(2)} SOL</td>
                          <td className="py-3.5 font-bold text-brand-600">+{Number(tx.points).toLocaleString()} PTS</td>
                          <td className="py-3.5 font-mono text-slate-400">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand-500 underline font-semibold"
                            >
                              <span className="hidden lg:inline">{tx.signature}</span>
                              <span className="inline lg:hidden">{tx.signature.slice(0, 6)}...{tx.signature.slice(-6)}</span>
                            </a>
                          </td>
                          <td className="py-3.5 text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5. WITHDRAWALS TAB */}
              {activeTab === 'withdrawals' && (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-3">Wallet Address</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Fee Deducted</th>
                        <th className="pb-3">Signature</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWithdrawals.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-700 break-all" title={tx.wallet_address}>
                            <span className="hidden md:inline">{tx.wallet_address}</span>
                            <span className="inline md:hidden">{tx.wallet_address.slice(0, 8)}...{tx.wallet_address.slice(-8)}</span>
                          </td>
                          <td className="py-3.5 font-bold text-rose-600">-{Number(tx.amount).toFixed(2)} SOL</td>
                          <td className="py-3.5 text-slate-500">{Number(tx.fee).toFixed(2)} SOL</td>
                          <td className="py-3.5 font-mono text-slate-400">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand-500 underline font-semibold"
                            >
                              <span className="hidden lg:inline">{tx.signature}</span>
                              <span className="inline lg:hidden">{tx.signature.slice(0, 6)}...{tx.signature.slice(-6)}</span>
                            </a>
                          </td>
                          <td className="py-3.5 text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 6. FAUCET CLAIMS TAB */}
              {activeTab === 'faucet' && (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-3">Wallet Address</th>
                        <th className="pb-3">Amount Claimed</th>
                        <th className="pb-3">Signature</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFaucets.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-700 break-all" title={tx.wallet_address}>
                            <span className="hidden md:inline">{tx.wallet_address}</span>
                            <span className="inline md:hidden">{tx.wallet_address.slice(0, 8)}...{tx.wallet_address.slice(-8)}</span>
                          </td>
                          <td className="py-3.5 font-bold text-blue-600">{Number(tx.amount).toFixed(1)} SOL</td>
                          <td className="py-3.5 font-mono text-slate-400">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand-500 underline font-semibold"
                            >
                              <span className="hidden lg:inline">{tx.signature}</span>
                              <span className="inline lg:hidden">{tx.signature.slice(0, 6)}...{tx.signature.slice(-6)}</span>
                            </a>
                          </td>
                          <td className="py-3.5 text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>

      </main>
    </div>
  );
};

export default AdminUser;
