import { useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../services/supabase/client';

export function useWalletAuth() {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const didUpsert = useRef(false);

  const upsertUser = useCallback(async (walletAddress: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert(
          { wallet_address: walletAddress },
          { onConflict: 'wallet_address', ignoreDuplicates: true }
        );
      if (error) {
        console.error('[useWalletAuth] Supabase upsert error:', error.message);
      }
    } catch (err) {
      console.error('[useWalletAuth] Unexpected error:', err);
    }
  }, []);

  useEffect(() => {
    if (connected && publicKey && !didUpsert.current) {
      didUpsert.current = true;
      upsertUser(publicKey.toString());
    }
    if (!connected) {
      didUpsert.current = false;
    }
  }, [connected, publicKey, upsertUser]);

  return {
    publicKey,
    connected,
    connecting,
    walletAddress: publicKey?.toString() ?? null,
    walletLabel: publicKey
      ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
      : null,
    walletName: wallet?.adapter.name ?? null,
    disconnect,
  };
}

