import { useState, useRef, useEffect, type FC } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '../hooks/useWalletAuth';

const WalletButton: FC = () => {
  const { connected, connecting, walletAddress, walletLabel, disconnect } = useWalletAuth();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    setMenuOpen(false);
    disconnect();
  };

  // Not connected — show sign in button
  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold shadow transition-all disabled:opacity-60"
        aria-label="Sign in with Solana"
      >
        {connecting ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin text-xs" />
            Connecting…
          </>
        ) : (
          <>
            {/* Solana logo inline SVG */}
            <svg width="14" height="14" viewBox="0 0 397.7 311.7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <linearGradient id="sol-a" x1="360.88" y1="351.46" x2="141.2" y2="-69.07" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#9945ff"/>
                <stop offset=".14" stopColor="#8752f3"/>
                <stop offset=".42" stopColor="#5497d5"/>
                <stop offset=".68" stopColor="#43b4ca"/>
                <stop offset=".82" stopColor="#28e0b9"/>
                <stop offset="1" stopColor="#19fb9b"/>
              </linearGradient>
              <path fill="url(#sol-a)" d="M64.6 237.9a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9l-62.7 62.7a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9l62.7-62.7zm0-164a14 14 0 0 1 9.9-4.1h317.4c6.2 0 9.4 7.5 5 11.9L334.2 144a14 14 0 0 1-9.9 4.1H6.9c-6.2 0-9.4-7.5-5-11.9L64.6 73.9zm264.6 82a14 14 0 0 0-9.9-4.1H2.9c-6.2 0-9.4 7.5-5 11.9l62.7 62.7a14 14 0 0 0 9.9 4.1h317.4c6.2 0 9.4-7.5 5-11.9l-63.7-62.7z"/>
            </svg>
            Sign in
          </>
        )}
      </button>
    );
  }

  // Connected — show wallet label + popup menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 active:scale-95 text-gray-800 text-xs font-semibold shadow-sm transition-all"
        aria-label="Wallet menu"
        aria-expanded={menuOpen}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-wallet text-white" style={{ fontSize: '8px' }} />
        </div>
        <span className="font-mono tracking-tight">{walletLabel}</span>
        <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} style={{ fontSize: '9px' }} />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-[fadeIn_0.15s_ease-out]">
          {/* Wallet address */}
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Connected wallet</p>
            <p className="font-mono text-xs text-gray-700 truncate">{walletAddress}</p>
          </div>

          {/* Copy action */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <i className={`fa-solid ${copied ? 'fa-check text-green-500' : 'fa-copy text-blue-500'} text-xs`} />
            </span>
            {copied ? 'Copied!' : 'Copy address'}
          </button>

          {/* Disconnect action */}
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50"
          >
            <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
              <i className="fa-solid fa-arrow-right-from-bracket text-red-400 text-xs" />
            </span>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
