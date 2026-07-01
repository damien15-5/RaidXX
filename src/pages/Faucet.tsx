import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Devnet genesis hash
const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
const FN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// ─── RaidX Logo ───────────────────────────────────────────────────────────────
const RaidXLogo = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
    </svg>
  </div>
);

const Faucet = () => {
  const { connected, walletAddress, connecting } = useWalletAuth();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [isDevnet, setIsDevnet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // claimsLeft = null means not yet checked
  const [claimsLeft, setClaimsLeft] = useState<number | null>(null);
  const [nextClaimTime, setNextClaimTime] = useState<string | null>(null);

  // Validate network
  useEffect(() => {
    if (!connected) {
      setIsDevnet(null);
      return;
    }
    connection.getGenesisHash().then(hash => {
      setIsDevnet(hash === DEVNET_GENESIS);
    }).catch(() => setIsDevnet(null));
  }, [connected, connection]);

  // Check remaining claims when wallet connects
  useEffect(() => {
    if (!connected || !walletAddress) {
      setClaimsLeft(null);
      setNextClaimTime(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${FN_BASE}/faucet?wallet=${walletAddress}`, {
          headers: FN_HEADERS,
        });
        const data = await res.json();
        if (typeof data.claimsLeft === 'number') {
          setClaimsLeft(data.claimsLeft);
          setNextClaimTime(data.nextClaimTime || null);
        }
      } catch (_) {
        // silently ignore — not critical
      }
    })();
  }, [connected, walletAddress]);

  const handleClaim = async () => {
    if (!connected || !walletAddress) return;
    if (isDevnet === false) {
      setErrorMsg('Please switch your wallet to Solana Devnet first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTxSignature(null);

    try {
      const response = await fetch(`${FN_BASE}/faucet`, {
        method: 'POST',
        headers: FN_HEADERS,
        body: JSON.stringify({ wallet: walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('Successfully claimed 0.3 Devnet SOL!');
        setTxSignature(data.signature);
        if (typeof data.claimsLeft === 'number') {
          setClaimsLeft(data.claimsLeft);
          setNextClaimTime(data.nextClaimTime || null);
        }
      } else {
        setErrorMsg(data.message || 'Faucet claim failed. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const canClaim = claimsLeft === null || claimsLeft > 0;
  const claimsLabel =
    claimsLeft === null
      ? null
      : claimsLeft === 0
      ? `0 claims left today`
      : `${claimsLeft} claim${claimsLeft !== 1 ? 's' : ''} remaining today`;

  return (
    /* Full-height flex column so content stays between header and bottom bar */
    <div className="flex flex-col min-h-screen bg-surface">

      {/* ── Sticky header (matches Wallet.tsx) ─────────────────────────────── */}
      <header className="flex sticky top-0 z-10 w-full px-4 py-3 items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="flex items-center gap-2">
          <RaidXLogo />
          <h1 className="text-base font-extrabold text-gray-900">Faucet</h1>
        </div>
        {/* Network badge */}
        {connected && isDevnet !== null && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            isDevnet
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {isDevnet ? 'Devnet ✓' : 'Wrong Network'}
          </span>
        )}
      </header>

      {/* ── Ambient blobs ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* ── Body: vertically centred between header & bottom bar ────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 pb-24 pt-6">
        <div className="w-full max-w-sm">

          {/* ── Main card ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100/60">

            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center text-white text-3xl shadow-lg shadow-brand-500/25">
              <i className="fa-solid fa-droplet" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-1">
              Devnet Faucet
            </h2>
            <p className="text-sm text-gray-400 text-center mb-1">
              Get 0.3 SOL on Solana Devnet to test the platform.
            </p>

            {/* Rate-limit info */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <i className="fa-solid fa-clock-rotate-left text-[10px] text-gray-300" />
              <span className="text-[11px] text-gray-400 font-medium">
                Max 2 claims per wallet per 24 h
              </span>
            </div>

            {/* Remaining claims badge */}
            {connected && claimsLabel && (
              <div className={`mb-5 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${
                claimsLeft === 0
                  ? 'bg-red-50 text-red-500 border border-red-100'
                  : 'bg-brand-50 text-brand-600 border border-brand-100'
              }`}>
                <i className={`fa-solid ${claimsLeft === 0 ? 'fa-ban' : 'fa-bolt'} text-[11px]`} />
                {claimsLabel}
              </div>
            )}

            {/* Error / Success messages */}
            {errorMsg && (
              <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs flex gap-2.5 items-start">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex flex-col gap-2">
                <div className="flex gap-2.5 items-start">
                  <i className="fa-solid fa-circle-check mt-0.5 shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
                {txSignature && (
                  <div className="mt-1 pt-2 border-t border-emerald-200/60 flex flex-col gap-1">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Transaction</span>
                    <a
                      href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-brand-600 hover:text-brand-700 underline break-all"
                    >
                      {txSignature} <i className="fa-solid fa-arrow-up-right-from-square ml-0.5 text-[9px]" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Next-claim countdown */}
            {claimsLeft === 0 && nextClaimTime && (
              <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs flex gap-2 items-start">
                <i className="fa-solid fa-hourglass-half mt-0.5 shrink-0" />
                <span>Your next claim is available at <strong>{new Date(nextClaimTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.</span>
              </div>
            )}

            {/* ── Action area ─────────────────────────────────────────────── */}
            {!connected ? (
              <button
                id="faucet-connect-wallet-btn"
                onClick={() => setVisible(true)}
                disabled={connecting}
                className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 text-sm"
              >
                <i className="fa-solid fa-wallet" />
                {connecting ? 'Connecting...' : 'Connect Wallet to Claim'}
              </button>

            ) : isDevnet === false ? (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs flex flex-col gap-2">
                <div className="flex gap-2 items-center font-bold">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>Wrong Network</span>
                </div>
                <p className="opacity-80 leading-relaxed">
                  Switch your wallet to <strong>Solana Devnet</strong> to claim an airdrop.
                </p>
              </div>

            ) : (
              <button
                id="faucet-claim-btn"
                onClick={handleClaim}
                disabled={loading || claimsLeft === 0}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-100 disabled:text-gray-400 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-md shadow-brand-500/25 disabled:shadow-none flex items-center justify-center gap-2.5 text-sm"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    Airdropping 0.3 SOL…
                  </>
                ) : claimsLeft === 0 ? (
                  <>
                    <i className="fa-solid fa-ban" />
                    Limit Reached — Try Tomorrow
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-parachute-box" />
                    Claim 0.3 Dev SOL
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info pills */}
          <div className="mt-5 flex gap-3">
            <div className="flex-1 bg-white rounded-2xl px-3 py-3 border border-gray-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-coins text-brand-500 text-xs" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-800">0.3 SOL</p>
                <p className="text-[10px] text-gray-400">Per claim</p>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl px-3 py-3 border border-gray-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-repeat text-emerald-500 text-xs" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-800">2× / day</p>
                <p className="text-[10px] text-gray-400">Per wallet</p>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl px-3 py-3 border border-gray-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                <i className="fa-brands fa-solana text-sky-500 text-xs" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-800">Devnet</p>
                <p className="text-[10px] text-gray-400">Only</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faucet;
