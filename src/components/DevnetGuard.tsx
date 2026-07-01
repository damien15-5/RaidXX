import { type FC } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useState, useEffect } from 'react';

// Devnet genesis hash (fixed, well-known value)
const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

const DevnetGuard: FC = () => {
  const { connected } = useWalletAuth();
  const { connection } = useConnection();
  const [isDevnet, setIsDevnet] = useState<boolean | null>(null);

  useEffect(() => {
    if (!connected) { setIsDevnet(null); return; }
    connection.getGenesisHash().then(hash => {
      setIsDevnet(hash === DEVNET_GENESIS);
    }).catch(() => setIsDevnet(null));
  }, [connected, connection]);

  if (!connected || isDevnet !== false) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="bg-amber-500 text-white rounded-2xl shadow-lg px-4 py-3 max-w-sm w-full flex items-start gap-3 pointer-events-auto">
        <i className="fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Wrong Network</p>
          <p className="text-xs mt-0.5 opacity-90">
            Switch your wallet to <strong>Solana Devnet</strong> to use this app.
          </p>
          <p className="text-xs mt-1 opacity-75">
            In Phantom: Settings → Developer Settings → Change Network → Devnet
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevnetGuard;
