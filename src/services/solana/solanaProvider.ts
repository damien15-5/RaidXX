import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'

export interface SolanaProvider {
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

// Devnet connection
export const solanaConnection = new Connection('https://api.devnet.solana.com', 'confirmed')

export function getProvider(): SolanaProvider | null {
  if (typeof window !== 'undefined' && window.solana) {
    return window.solana
  }
  return null
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider()
  if (!provider) {
    throw new Error('Solana wallet provider not found. Please install Phantom or another Solana wallet extension.')
  }
  const response = await provider.connect()
  return response.publicKey.toString()
}

export async function disconnectWallet(): Promise<void> {
  const provider = getProvider()
  if (provider) {
    await provider.disconnect()
  }
}

export async function fetchWalletBalance(walletAddress: string): Promise<number> {
  try {
    const pubKey = new PublicKey(walletAddress)
    const balanceLamports = await solanaConnection.getBalance(pubKey)
    return balanceLamports / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return 0
  }
}

export async function sendDepositTransaction(
  senderAddress: string,
  recipientAddress: string,
  amountSol: number
): Promise<string> {
  const provider = getProvider()
  if (!provider) {
    throw new Error('Solana wallet not connected')
  }

  const fromPubKey = new PublicKey(senderAddress)
  const toPubKey = new PublicKey(recipientAddress)

  // 1. Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromPubKey,
      toPubkey: toPubKey,
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL)
    })
  )

  // 2. Fetch blockhash
  const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = fromPubKey

  // 3. Request wallet to sign and send transaction
  const { signature } = await provider.signAndSendTransaction(transaction)

  // 4. Confirm the transaction
  console.log(`Transaction submitted with signature: ${signature}. Awaiting confirmation...`)
  const latestBlockHash = await solanaConnection.getLatestBlockhash()
  await solanaConnection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature
  }, 'confirmed')

  return signature
}
