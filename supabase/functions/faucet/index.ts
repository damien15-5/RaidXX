import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from 'https://esm.sh/@solana/web3.js@1.91.1?bundle&minify&no-dts'
import bs58 from 'https://esm.sh/bs58@5.0.0?bundle&minify&no-dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FAUCET_AMOUNT   = 0.3         // SOL per claim
const MAX_CLAIMS_24H  = 2           // max claims per wallet per 24 hours

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Helper: count faucet claims in the last 24 h for a wallet ──────────
    const countRecentClaims = async (wallet: string) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('created_at')
        .eq('wallet_address', wallet)
        .eq('type', 'faucet')
        .gte('created_at', since)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    }

    // ── GET  /faucet?wallet=<address>  — return claimsLeft without sending ─
    if (req.method === 'GET') {
      const url   = new URL(req.url)
      const wallet = url.searchParams.get('wallet')
      if (!wallet) throw new Error('wallet query param is required')

      const recent      = await countRecentClaims(wallet)
      const claimsUsed  = recent.length
      const claimsLeft  = Math.max(0, MAX_CLAIMS_24H - claimsUsed)

      // When will the oldest claim expire?
      let nextClaimTime: string | null = null
      if (claimsLeft === 0 && recent.length > 0) {
        const oldestMs   = new Date(recent[0].created_at).getTime()
        nextClaimTime    = new Date(oldestMs + 24 * 60 * 60 * 1000).toISOString()
      }

      return new Response(JSON.stringify({ success: true, claimsLeft, nextClaimTime }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── POST /faucet  — actually send an airdrop ───────────────────────────
    const body   = await req.json().catch(() => ({}))
    const wallet = body.wallet || body.wallet_address
    if (!wallet) throw new Error('wallet is required')

    // 1. Rate-limit check
    const recent     = await countRecentClaims(wallet)
    const claimsUsed = recent.length

    if (claimsUsed >= MAX_CLAIMS_24H) {
      const oldestMs      = new Date(recent[0].created_at).getTime()
      const nextClaimTime = new Date(oldestMs + 24 * 60 * 60 * 1000).toISOString()
      return new Response(JSON.stringify({
        success: false,
        claimsLeft: 0,
        nextClaimTime,
        message: `You have reached the limit of ${MAX_CLAIMS_24H} faucet claims per 24 hours. Try again after ${new Date(nextClaimTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Load treasury private key
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    if (!rawPrivateKey) throw new Error('Treasury not configured')

    let treasuryKeypair: Keypair;
    if (rawPrivateKey.trim().startsWith('[')) {
      treasuryKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawPrivateKey)))
    } else {
      treasuryKeypair = Keypair.fromSecretKey(bs58.decode(rawPrivateKey.trim()))
    }

    // 3. Connect to Solana Devnet
    const connection         = new Connection('https://devnet.helius-rpc.com/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9', 'confirmed')
    const recipientPubKey    = new PublicKey(wallet)
    const faucetLamports     = FAUCET_AMOUNT * LAMPORTS_PER_SOL

    const treasuryBalance    = await connection.getBalance(treasuryKeypair.publicKey)
    if (treasuryBalance < faucetLamports + 5000) {
      throw new Error('Insufficient funds in treasury wallet')
    }

    // 4. Send transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubKey,
        lamports: faucetLamports,
      })
    )

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])

    // 5. Ensure user exists
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle()

    if (userError) throw userError

    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ wallet_address: wallet, sol_balance: 0.0, points: 0.0 })
        .select('*')
        .single()

      if (createError) throw createError
      user = newUser
    }

    // 6. Log transaction
    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id:        user.id,
      wallet_address: wallet,
      type:           'faucet',
      amount:         FAUCET_AMOUNT,
      signature,
      status:         'confirmed',
    })

    if (txError) throw txError

    // 7. Return updated claim count
    const newClaimsUsed = claimsUsed + 1
    const claimsLeft    = Math.max(0, MAX_CLAIMS_24H - newClaimsUsed)
    let nextClaimTime: string | null = null
    if (claimsLeft === 0) {
      nextClaimTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    return new Response(JSON.stringify({
      success: true,
      signature,
      amount: FAUCET_AMOUNT,
      claimsLeft,
      nextClaimTime,
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
