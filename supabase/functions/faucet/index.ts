import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from 'https://esm.sh/@solana/web3.js@1.91.1'
import bs58 from 'https://esm.sh/bs58@5.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { wallet_address } = await req.json()
    if (!wallet_address) throw new Error('wallet_address is required')

    // 2. Load treasury private key
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    if (!rawPrivateKey) throw new Error('Treasury not configured')

    let treasuryKeypair;
    if (rawPrivateKey.trim().startsWith('[')) {
      treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawPrivateKey)))
    } else {
      treasuryKeypair = Keypair.fromSecretKey(bs58.decode(rawPrivateKey.trim()))
    }

    // 3. Connect to Solana Devnet via Helius RPC
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9', 'confirmed')
    const recipientPubKey = new PublicKey(wallet_address)
    const faucetAmountLamports = 0.2 * LAMPORTS_PER_SOL

    // Check treasury balance
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
    if (treasuryBalance < faucetAmountLamports + 5000) {
      throw new Error('Insufficient funds in treasury wallet')
    }

    // 4. Create & send transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubKey,
        lamports: faucetAmountLamports
      })
    )

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])

    // 5. Update Supabase (Bypass RLS using Service Role to update DB)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ensure user exists in 'users' table
    await supabaseAdmin.from('users').upsert({ id: user.id, wallet_address }, { onConflict: 'id' })

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      wallet_address,
      type: 'faucet',
      amount: 0.2,
      signature,
      status: 'confirmed'
    })

    return new Response(JSON.stringify({ success: true, signature, amount: 0.2 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
