import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Devnet genesis hash
const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const API_BASE = 'http://127.0.0.1:3001/api';

const Faucet = () => {
  const { connected, walletAddress, connecting } = useWalletAuth();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [isDevnet, setIsDevnet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Validate network
  useEffect(() => {
    if (!connected) {
      setIsDevnet(null);
      return;
    }
    connection.getGenesisHash().then(hash => {
      setIsDevnet(hash === DEVNET_GENESIS);
    }).catch(() => {
      setIsDevnet(null);
    });
  }, [connected, connection]);

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
      const response = await fetch(`${API_BASE}/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet: walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('Successfully claimed 0.3 Devnet SOL!');
        setTxSignature(data.signature);
      } else {
        setErrorMsg(data.message || 'Faucet claim failed. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to connect to backend server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 pt-20 pb-24">
      {/* Header Spacer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto">
        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center text-white text-2xl shadow-sm">
            <i className="fa-solid fa-droplet" />
          </div>

          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">Devnet Faucet</h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Claim 0.3 SOL directly to your wallet on the Solana Devnet to test platform operations.
          </p>

          {/* Status Displays */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs flex gap-2.5 items-start">
              <i className="fa-solid fa-circle-exclamation mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-xs flex flex-col gap-2">
              <div className="flex gap-2.5 items-start">
                <i className="fa-solid fa-circle-check mt-0.5" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              {txSignature && (
                <div className="mt-1 pt-2 border-t border-green-200/50 flex flex-col gap-1">
                  <span className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Transaction Signature</span>
                  <a
                    href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-brand-600 hover:text-brand-700 underline truncate break-all"
                  >
                    {txSignature} <i className="fa-solid fa-arrow-up-right-from-square ml-0.5 text-[9px]" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              disabled={connecting}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-wallet" />
              {connecting ? 'Connecting...' : 'Connect Wallet First'}
            </button>
          ) : isDevnet === false ? (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs flex flex-col gap-2">
              <div className="flex gap-2 items-start font-semibold">
                <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                <span>Wrong Network Selected</span>
              </div>
              <p className="opacity-90">
                You must switch your wallet connection to <strong>Solana Devnet</strong> to claim faucet airdrops.
              </p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 active:scale-98 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  Airdropping 0.3 SOL...
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
      </div>
    </div>
  );
};

export default Faucet;
