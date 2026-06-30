import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, Keypair, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.91.1'
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

    const { wallet_address, signature, amount } = await req.json()
    if (!wallet_address || !signature || !amount) throw new Error('Missing required fields')

    // Treasury setup
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    if (!rawPrivateKey) throw new Error('Treasury not configured')
    const treasuryKeypair = rawPrivateKey.trim().startsWith('[') 
      ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawPrivateKey)))
      : Keypair.fromSecretKey(bs58.decode(rawPrivateKey.trim()))
    const treasuryAddress = treasuryKeypair.publicKey.toString()

    // Verify transaction on-chain using Helius Enhanced Transactions API
    const res = await fetch(`https://devnet.helius-rpc.com/v0/transactions/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [signature] })
    })
    const txData = await res.json()

    if (!txData || txData.length === 0) {
      throw new Error('Transaction not found on chain. Wait a moment and try again.')
    }

    const tx = txData[0]

    if (tx.transactionError) {
      throw new Error('Transaction failed on chain.')
    }

    // Find the transfer to treasury from the user
    const transfer = tx.nativeTransfers?.find((t: any) => 
      t.fromUserAccount === wallet_address && 
      t.toUserAccount === treasuryAddress
    )

    if (!transfer) {
      throw new Error('No transfer to treasury found in this transaction.')
    }

    // Validate transferred amount
    const diff = transfer.amount / LAMPORTS_PER_SOL

    if (Math.abs(diff - amount) > 0.001) {
      throw new Error(`Transferred amount on-chain (${diff}) does not match requested deposit (${amount}).`)
    }

    // Update DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const pointsGranted = amount * 1000

    // Fetch user current balances
    const { data: userData } = await supabaseAdmin.from('users').select('sol_balance, points').eq('id', user.id).single()
    const currentBalance = userData?.sol_balance || 0
    const currentPoints = userData?.points || 0

    // Increment balance
    await supabaseAdmin.from('users').update({ 
      sol_balance: Number(currentBalance) + Number(amount),
      points: Number(currentPoints) + Number(pointsGranted)
    }).eq('id', user.id)

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      wallet_address,
      type: 'deposit',
      amount,
      points: pointsGranted,
      signature,
      status: 'confirmed'
    })

    return new Response(JSON.stringify({ success: true, message: 'Deposit verified!' }), {
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
