import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bs58 from 'https://esm.sh/bs58@5.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LAMPORTS_PER_SOL = 1_000_000_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const wallet = body.wallet || body.wallet_address
    const { signature, amount } = body

    if (!wallet || !signature || !amount) {
      throw new Error('Missing required fields')
    }

    // Treasury setup
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    if (!rawPrivateKey) throw new Error('Treasury not configured')
    const decoded = rawPrivateKey.trim().startsWith('[') 
      ? Uint8Array.from(JSON.parse(rawPrivateKey))
      : bs58.decode(rawPrivateKey.trim())
    const treasuryAddress = bs58.encode(decoded.slice(32))

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
      t.fromUserAccount === wallet && 
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

    // Check if signature has already been processed to prevent double deposits
    const { data: existingTx, error: checkTxErr } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('signature', signature)
      .maybeSingle()

    if (checkTxErr) throw checkTxErr
    if (existingTx) {
      throw new Error('This transaction signature has already been processed.')
    }

    const pointsGranted = amount * 10000

    // Fetch user current balances
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .single()

    if (fetchErr) throw fetchErr

    const newBalance = Number(user.sol_balance) + Number(amount)
    const newPoints = newBalance * 10000

    // Increment balance
    const { error: updateErr } = await supabaseAdmin.from('users').update({ 
      sol_balance: newBalance,
      points: newPoints,
      updated_at: new Date()
    }).eq('wallet_address', wallet)

    if (updateErr) throw updateErr

    // Log transaction
    const { error: txErr } = await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      wallet_address: wallet,
      type: 'deposit',
      amount,
      points: pointsGranted,
      signature,
      status: 'confirmed'
    })

    if (txErr) throw txErr

    return new Response(JSON.stringify({
      success: true,
      message: 'Deposit verified and credited successfully!',
      newBalance,
      pointsGranted
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

