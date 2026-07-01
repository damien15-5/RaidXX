import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const wallet = body.wallet || body.wallet_address
    const { parent_task_id, sub_task_id, proof_data } = body

    if (!wallet || !parent_task_id || !sub_task_id) {
      throw new Error('Missing required fields')
    }

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

    const { data: record, error: recordError } = await supabaseAdmin
      .from('task_records')
      .insert({
        user_id: user.id,
        parent_task_id,
        sub_task_id,
        proof_data,
        status: 'pending'
      })
      .select('*')
      .single()

    if (recordError) throw recordError

    return new Response(JSON.stringify({ success: true, record }), {
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
