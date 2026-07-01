import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from 'https://esm.sh/@solana/web3.js@1.91.1?bundle&minify&no-dts'
import bs58 from 'https://esm.sh/bs58@5.0.0?bundle&minify&no-dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const wallet = body.wallet || body.wallet_address
    const { amount } = body

    if (!wallet || !amount || amount <= 0) {
      throw new Error('Invalid withdrawal request')
    }

    // Admin Client for updating balances reliably
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check balances
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!user) {
      throw new Error('User not found in system.')
    }

    // We charge a fixed 0.04 SOL fee
    const fee = 0.04
    const totalDeduction = Number(amount) + fee

    if (Number(user.sol_balance) < totalDeduction) {
      throw new Error(`Insufficient balance. Requested: ${amount} SOL + Fee: ${fee} SOL (Total: ${totalDeduction.toFixed(4)} SOL). Your balance: ${user.sol_balance} SOL.`)
    }

    // Constraint: Max withdrawal rule if balance is exactly 3 SOL
    if (Number(user.sol_balance) === 3 && Number(amount) > 2.95) {
      throw new Error('Withdrawing with a balance of exactly 3 SOL cannot exceed a maximum request of 2.95 SOL.')
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
        toPubkey: new PublicKey(wallet),
        lamports: withdrawalAmountLamports
      })
    )

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])

    // Update user balance & points
    const pointsDeducted = amount * 10000
    const newBalance = Number(user.sol_balance) - totalDeduction
    const newPoints = newBalance * 10000

    const { error: updateErr } = await supabaseAdmin.from('users').update({ 
      sol_balance: newBalance,
      points: newPoints,
      updated_at: new Date()
    }).eq('wallet_address', wallet)

    if (updateErr) throw updateErr

    // Update platform/treasury wallet balance in DB (credit the fee)
    const treasuryAddress = treasuryKeypair.publicKey.toString()
    const { data: treasuryUser, error: treasuryFetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', treasuryAddress)
      .maybeSingle()

    if (treasuryFetchErr) throw treasuryFetchErr

    if (treasuryUser) {
      const { error: treasuryUpdateErr } = await supabaseAdmin
        .from('users')
        .update({
          sol_balance: Number(treasuryUser.sol_balance) + fee,
          updated_at: new Date()
        })
        .eq('wallet_address', treasuryAddress)
      if (treasuryUpdateErr) throw treasuryUpdateErr
    } else {
      const { error: treasuryInsertErr } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: treasuryAddress,
          sol_balance: fee
        })
      if (treasuryInsertErr) throw treasuryInsertErr
    }

    // Log transaction
    const { error: txErr } = await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      wallet_address: wallet,
      type: 'withdrawal',
      amount,
      fee,
      points: -pointsDeducted,
      signature,
      status: 'confirmed'
    })

    if (txErr) throw txErr

    return new Response(JSON.stringify({
      success: true,
      signature,
      amount,
      fee,
      newBalance,
      newPoints
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

