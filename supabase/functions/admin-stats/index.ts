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

    // 1. Fetch Users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) throw usersError

    // 2. Fetch Tasks (Bundles)
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        status,
        created_at,
        tasks_data,
        users:posted_by (
          wallet_address
        )
      `)
      .order('created_at', { ascending: false })

    if (tasksError) throw tasksError

    // 3. Fetch Transactions
    const { data: transactions, error: txsError } = await supabaseAdmin
      .from('transactions')
      .select(`
        id,
        wallet_address,
        type,
        amount,
        fee,
        points,
        signature,
        status,
        created_at,
        users:user_id (
          wallet_address
        )
      `)
      .order('created_at', { ascending: false })

    if (txsError) throw txsError

    // 4. Fetch Submissions (Task Records)
    const { data: submissions, error: subError } = await supabaseAdmin
      .from('task_records')
      .select(`
        id,
        sub_task_id,
        status,
        proof_data,
        created_at,
        users:user_id (
          wallet_address
        ),
        tasks:parent_task_id (
          tasks_data
        )
      `)
      .order('created_at', { ascending: false })

    if (subError) throw subError

    // Format Tasks
    const formattedTasks = (tasks || []).map((t: any) => ({
      id: t.id,
      status: t.status,
      created_at: t.created_at,
      tasks_data: t.tasks_data,
      posted_by: t.users?.wallet_address || 'Unknown'
    }))

    // Format Submissions
    const formattedSubmissions = (submissions || []).map((r: any) => {
      const tasksData = r.tasks?.tasks_data
      const subTasks = Array.isArray(tasksData) 
        ? tasksData 
        : (tasksData?.tasks || tasksData?.subTasks || [])
      const subTask = subTasks.find((t: any) => t.sub_task_id === r.sub_task_id || t.id === r.sub_task_id)

      return {
        id: r.id,
        sub_task_id: r.sub_task_id,
        status: r.status,
        proof_data: r.proof_data,
        created_at: r.created_at,
        wallet_address: r.users?.wallet_address || 'Unknown',
        sub_task: subTask || null
      }
    })

    return new Response(JSON.stringify({
      success: true,
      users: users || [],
      tasks: formattedTasks,
      transactions: transactions || [],
      submissions: formattedSubmissions
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
