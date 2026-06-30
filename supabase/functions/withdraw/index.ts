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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { wallet_address, amount } = await req.json()
    if (!wallet_address || !amount || amount <= 0) throw new Error('Invalid withdrawal request')

    // Admin Client for updating balances reliably
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check balances
    const { data: userData, error: fetchErr } = await supabaseAdmin.from('users').select('*').eq('id', user.id).single()
    if (fetchErr || !userData) throw new Error('User not found in system.')

    // We charge a fixed 0.04 SOL fee as requested in the plan
    const fee = 0.04
    const totalDeduction = Number(amount) + fee

    if (Number(userData.sol_balance) < totalDeduction) {
      throw new Error(`Insufficient balance. Requested: ${amount} SOL + Fee: ${fee} SOL (Total: ${totalDeduction.toFixed(4)} SOL). Your balance: ${userData.sol_balance} SOL.`)
    }

    // Treasury setup
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    if (!rawPrivateKey) throw new Error('Treasury not configured')
    const treasuryKeypair = rawPrivateKey.trim().startsWith('[') 
      ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawPrivateKey)))
      : Keypair.fromSecretKey(bs58.decode(rawPrivateKey.trim()))

    // Connect to Devnet via Helius RPC & check treasury
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9', 'confirmed')
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
    const withdrawalAmountLamports = Math.floor(amount * LAMPORTS_PER_SOL)

    if (treasuryBalance < withdrawalAmountLamports + 5000) {
      throw new Error('Backend treasury has insufficient on-chain SOL to fulfill the request.')
    }

    // Transfer from Treasury to User
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: new PublicKey(wallet_address),
        lamports: withdrawalAmountLamports
      })
    )

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])

    // Update balances
    const pointsDeducted = amount * 1000
    const newBalance = Number(userData.sol_balance) - totalDeduction
    const newPoints = Math.max(0, Number(userData.points) - pointsDeducted)

    await supabaseAdmin.from('users').update({ 
      sol_balance: newBalance,
      points: newPoints
    }).eq('id', user.id)

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      wallet_address,
      type: 'withdrawal',
      amount,
      fee,
      points: -pointsDeducted,
      signature,
      status: 'confirmed'
    })

    return new Response(JSON.stringify({ success: true, signature, amount, fee, newBalance }), {
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
