import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    const url = new URL(req.url)
    
    // Parse wallet from query param or from path segments (like /get-user/wallet_address)
    let wallet = url.searchParams.get('wallet')
    if (!wallet) {
      const pathParts = url.pathname.split('/')
      const lastPart = pathParts[pathParts.length - 1]
      if (lastPart && lastPart !== 'get-user') {
        wallet = lastPart
      }
    }

    if (!wallet) {
      throw new Error('wallet is required')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create user
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

    // Get user transactions
    const { data: txs, error: txsError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('wallet_address', wallet)
      .order('created_at', { ascending: false })

    if (txsError) throw txsError

    // Resolve treasuryAddress using bs58 without loading heavy @solana/web3.js
    const rawPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')
    let treasuryAddress = 'Not configured'
    if (rawPrivateKey) {
      try {
        const decoded = rawPrivateKey.trim().startsWith('[') 
          ? Uint8Array.from(JSON.parse(rawPrivateKey))
          : bs58.decode(rawPrivateKey.trim())
        // For Solana, the public key is the last 32 bytes of the 64-byte keypair
        const pubKeyBytes = decoded.slice(32)
        treasuryAddress = bs58.encode(pubKeyBytes)
      } catch (err) {
        console.error('Failed to parse TREASURY_PRIVATE_KEY:', err.message)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user,
      transactions: txs || [],
      treasuryAddress
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

