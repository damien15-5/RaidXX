import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import WalletButton from '../components/WalletButton';

// Types
type TxType = 'deposit' | 'withdrawal' | 'faucet';

interface TransactionItem {
  id: string;
  type: TxType;
  created_at: string;
  amount: number;
  points: number;
  signature: string;
  status: string;
}

const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const API_BASE = 'http://127.0.0.1:3001/api';

const formatPoints = (pts: number) => {
  if (pts > 0 && pts < 0.00001) {
    return '<0.00001';
  }
  return pts.toLocaleString(undefined, { maximumFractionDigits: 5 });
};

const Wallet = () => {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [balanceHidden, setBalanceHidden] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [dbBalance, setDbBalance] = useState(0);
  const [dbPoints, setDbPoints] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [treasuryAddress, setTreasuryAddress] = useState<string | null>(null);

  // Sheets state
  const [showDepositSheet, setShowDepositSheet] = useState(false);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch stats from Express backend
  const fetchUserData = useCallback(async () => {
    if (!publicKey) return;
    setLoadingData(true);
    try {
      const res = await fetch(`${API_BASE}/user/${publicKey.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDbBalance(Number(data.user.sol_balance) || 0);
        setDbPoints(Number(data.user.points) || 0);
        setTransactions(data.transactions || []);
        setTreasuryAddress(data.treasuryAddress);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [publicKey]);

  // Fetch on-chain wallet balance
  const fetchWalletBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setWalletBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserData();
      fetchWalletBalance();
      const interval = setInterval(() => {
        fetchWalletBalance();
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setWalletBalance(0);
      setDbBalance(0);
      setDbPoints(0);
      setTransactions([]);
      setLoadingData(false);
    }
  }, [connected, publicKey, fetchUserData, fetchWalletBalance]);

  // Handle Deposit / Top Up
  const handleDeposit = async () => {
    if (!publicKey || !depositAmount || Number(depositAmount) <= 0) return;
    if (!treasuryAddress || treasuryAddress === 'Not configured') {
      showToast('Treasury address is not configured on the backend.', 'error');
      return;
    }

    // Verify network is Devnet
    try {
      const genesisHash = await connection.getGenesisHash();
      if (genesisHash !== DEVNET_GENESIS) {
        showToast('Please switch your wallet to Solana Devnet.', 'error');
        return;
      }
    } catch (err) {
      showToast('Failed to verify Solana network.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const amount = Number(depositAmount);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(treasuryAddress),
          lamports,
        })
      );

      showToast('Please sign the transaction in your wallet...');
      const signature = await sendTransaction(transaction, connection);

      showToast('Confirming transaction on-chain...');
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      showToast('Verifying transaction on platform...');
      const res = await fetch(`${API_BASE}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          signature,
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Top up successful! +${data.pointsGranted} PTS`);
        setDepositAmount('');
        setShowDepositSheet(false);
        fetchWalletBalance();
        fetchUserData();
      } else {
        showToast(data.message || 'Deposit verification failed.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Transaction failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdrawal
  const handleWithdrawal = async () => {
    if (!publicKey || !withdrawAmount || Number(withdrawAmount) <= 0) return;

    const amount = Number(withdrawAmount);
    const fee = 0.04;
    const totalDeduction = amount + fee;

    if (dbBalance < totalDeduction) {
      showToast(`Insufficient platform balance. You need ${totalDeduction.toFixed(2)} SOL (includes 0.04 SOL fee).`, 'error');
      return;
    }

    // Verify network is Devnet
    try {
      const genesisHash = await connection.getGenesisHash();
      if (genesisHash !== DEVNET_GENESIS) {
        showToast('Please switch your wallet to Solana Devnet.', 'error');
        return;
      }
    } catch (err) {
      showToast('Failed to verify Solana network.', 'error');
      return;
    }

    setActionLoading(false);
    setLoadingWithdraw(true);

    try {
      showToast('Processing withdrawal on backend...');
      const res = await fetch(`${API_BASE}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Successfully withdrew ${amount} SOL!`);
        setWithdrawAmount('');
        setShowWithdrawSheet(false);
        fetchWalletBalance();
        fetchUserData();
      } else {
        showToast(data.message || 'Withdrawal failed.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to connect to backend server.', 'error');
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-18 right-4 left-4 md:left-auto md:right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-lg border transition-all animate-[slideIn_0.3s_ease-out] ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-600'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
          }`}
        >
          {toast.type === 'error' ? (
            <i className="fa-solid fa-circle-xmark text-lg" />
          ) : (
            <i className="fa-solid fa-circle-check text-lg" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex fixed top-0 left-0 right-0 z-10 w-full p-3 items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="white" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">RaidX</h1>
        </div>
        <WalletButton />
      </header>

      {/* Balance Card */}
      <section className="mx-4 mt-20 rounded-3xl overflow-hidden shadow-sm border border-gray-100 bg-white">
        <div
          className="relative px-6 pt-6 pb-6"
          style={{ background: 'linear-gradient(135deg, #dde8ff 0%, #c7d9ff 40%, #bdd0ff 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-white/20 pointer-events-none" />
          <div className="absolute bottom-[-30px] left-[-20px] w-28 h-28 rounded-full bg-white/15 pointer-events-none" />

          {/* Label + eye */}
          <div className="flex items-center justify-between mb-2 relative">
            <span className="text-xs text-blue-800/70 font-semibold tracking-wider uppercase">Points</span>
            <button
              onClick={() => setBalanceHidden(v => !v)}
              className="text-blue-700/60 hover:text-blue-800 transition-colors"
              aria-label="Toggle balance visibility"
            >
              <i className={`fa-solid ${balanceHidden ? 'fa-eye-slash' : 'fa-eye'} text-lg`} />
            </button>
          </div>

          {/* Amount */}
          <div className="text-4xl font-extrabold text-gray-800 tracking-tight relative mb-6">
            {connected && loadingData ? (
              <div className="h-10 w-36 bg-gray-400/20 rounded-2xl animate-pulse" />
            ) : balanceHidden ? (
              '••••••'
            ) : (
              <div className="flex items-baseline gap-1">
                <span>{formatPoints(dbBalance * 10000)}</span>
                <span className="text-lg text-gray-600 font-semibold">PTS</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 relative">
            <button
              onClick={() => {
                if (!connected) {
                  showToast('Please connect your wallet first.', 'error');
                  return;
                }
                setShowDepositSheet(true);
              }}
              className="flex flex-1 justify-center items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-3 rounded-2xl shadow-sm transition-all active:scale-98"
            >
              <i className="fa-solid fa-circle-plus" />
              Top Up
            </button>
            <button
              onClick={() => {
                if (!connected) {
                  showToast('Please connect your wallet first.', 'error');
                  return;
                }
                setShowWithdrawSheet(true);
              }}
              className="flex flex-1 justify-center items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-3 rounded-2xl transition-all active:scale-98"
            >
              <i className="fa-solid fa-arrow-up" />
              Withdraw
            </button>
            <Link
              to="/faucet"
              className="flex flex-1 justify-center items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-3 rounded-2xl transition-all active:scale-98 text-center"
            >
              <i className="fa-solid fa-droplet" />
              Faucet
            </Link>
          </div>
        </div>

        {/* Sub-card stats */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 bg-white py-4 text-center">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Platform Balance</span>
            {connected && loadingData ? (
              <div className="h-6 w-24 bg-gray-200/50 rounded-xl animate-pulse mx-auto mt-1" />
            ) : (
              <span className="text-lg font-extrabold text-gray-900">{dbBalance.toFixed(4)} SOL</span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">On-Chain Wallet</span>
            {connected && loadingData ? (
              <div className="h-6 w-24 bg-gray-200/50 rounded-xl animate-pulse mx-auto mt-1" />
            ) : (
              <span className="text-lg font-extrabold text-gray-900">{walletBalance.toFixed(4)} SOL</span>
            )}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Recent Transactions</h3>
        </div>

        <div className="flex flex-col gap-2">
          {connected && loadingData ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-gray-100/50 shadow-xs animate-pulse"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-16 bg-gray-200 rounded-md" />
                  <div className="h-2 w-32 bg-gray-100 rounded-md" />
                </div>
                <div className="space-y-2 text-right shrink-0">
                  <div className="h-3 w-12 bg-gray-200 rounded-md ml-auto" />
                  <div className="h-2 w-16 bg-gray-100 rounded-md ml-auto" />
                </div>
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="text-center bg-white rounded-2xl p-8 border border-gray-100/50">
              <i className="fa-solid fa-receipt text-gray-300 text-3xl mb-2" />
              <p className="text-xs text-gray-400">No transactions recorded yet.</p>
            </div>
          ) : (
            transactions.map(tx => {
              const isDeposit = tx.type === 'deposit' || tx.type === 'faucet';
              const isExpanded = expandedTxId === tx.id;
              return (
                <div
                  key={tx.id}
                  onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                  className="flex flex-col bg-white hover:bg-gray-50/50 rounded-2xl px-4 py-3.5 border border-gray-100/50 shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border
                        ${
                          tx.type === 'faucet'
                            ? 'border-blue-100 text-blue-500 bg-blue-50/50'
                            : tx.type === 'deposit'
                            ? 'border-emerald-100 text-emerald-500 bg-emerald-50/50'
                            : 'border-orange-100 text-orange-500 bg-orange-50/50'
                        }`}
                    >
                      <i
                        className={`fa-solid ${
                          tx.type === 'faucet'
                            ? 'fa-droplet'
                            : tx.type === 'deposit'
                            ? 'fa-circle-plus'
                            : 'fa-arrow-up'
                        } text-sm`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 capitalize flex items-center gap-1.5">
                        {tx.type}
                        <i className={`fa-solid fa-chevron-down text-[8px] text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </p>
                      <span className="font-mono text-[10px] text-gray-400 block truncate mt-0.5">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${isDeposit ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {isDeposit ? '+' : '-'}{Number(tx.amount).toFixed(3)} SOL
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-3 pt-3 border-t border-gray-100/50 flex flex-col gap-2 animate-[slideIn_0.2s_ease-out]"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Solscan Transaction</span>
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 underline font-semibold flex items-center gap-1"
                        >
                          View Explorer <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                        </a>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 font-mono text-[10px] text-gray-600 break-all select-all border border-gray-100/50">
                        {tx.signature}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ---------------- DEPOSIT BOTTOM SHEET ---------------- */}
      {showDepositSheet && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => !actionLoading && setShowDepositSheet(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-xl z-50 pt-6 px-6 pb-28 border-t border-gray-100 animate-[slideUp_0.3s_ease-out]">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h3 className="text-lg font-bold text-gray-900 mb-2">Deposit / Top Up SOL</h3>
            <p className="text-xs text-gray-500 mb-6">
              Enter the amount of SOL you want to deposit to the platform.
            </p>

            <div className="mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Amount in SOL</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  disabled={actionLoading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">SOL</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositSheet(false)}
                disabled={actionLoading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all active:scale-98"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={actionLoading || !depositAmount || Number(depositAmount) <= 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
              >
                {actionLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-rotate" />
                    Sync & Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---------------- WITHDRAW BOTTOM SHEET ---------------- */}
      {showWithdrawSheet && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => !loadingWithdraw && setShowWithdrawSheet(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-xl z-50 pt-6 px-6 pb-28 border-t border-gray-100 animate-[slideUp_0.3s_ease-out]">
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h3 className="text-lg font-bold text-gray-900 mb-2">Withdraw SOL</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter the amount of SOL to withdraw to your wallet. Note: a fixed fee of **0.04 SOL** will be charged.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-100/50 rounded-2xl text-[11px] text-amber-800 mb-5 flex gap-2 items-start leading-relaxed">
              <i className="fa-solid fa-info mt-0.5" />
              <span>
                Withdrawals are processed directly from the treasury wallet. Make sure you have enough platform balance for both the amount and the fee.
              </span>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Amount in SOL</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  disabled={loadingWithdraw}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">SOL</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawSheet(false)}
                disabled={loadingWithdraw}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition-all active:scale-98"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={loadingWithdraw || !withdrawAmount || Number(withdrawAmount) <= 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
              >
                {loadingWithdraw ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check" />
                    Confirm Withdrawal
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Wallet;
