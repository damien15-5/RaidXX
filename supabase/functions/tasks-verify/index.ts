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
    const { record_id, status } = body

    if (!record_id || !['successful', 'failed'].includes(status)) {
      throw new Error('Invalid verification parameters')
    }

    // Fetch the task record with parent task details
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('task_records')
      .select('*, parent_task_id:parent_task_id(tasks_data)')
      .eq('id', record_id)
      .single()

    if (fetchError || !record) {
      throw new Error('Record not found')
    }

    if (record.status !== 'pending') {
      return new Response(JSON.stringify({ success: false, message: 'Submission already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('task_records')
      .update({ status })
      .eq('id', record_id)

    if (updateError) throw updateError

    let rewardAmount = 0
    let pointsReward = 0

    if (status === 'successful') {
      // Find subtask rewards
      const tasksData = record.parent_task_id?.tasks_data
      const subTasks = Array.isArray(tasksData)
        ? tasksData
        : (tasksData?.tasks || tasksData?.subTasks || [])
      const subTask = subTasks.find((t: any) => t.sub_task_id === record.sub_task_id || t.id === record.sub_task_id)

      if (subTask) {
        rewardAmount = subTask.rewardAmount || subTask.reward_amount || 0.05
        pointsReward = subTask.pointsReward || subTask.points_reward || 500
      }

      if (rewardAmount > 0 || pointsReward > 0) {
        const { data: solver, error: solverErr } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', record.user_id)
          .single()

        if (solverErr) throw solverErr

        if (solver) {
          const newBalance = Number(solver.sol_balance) + Number(rewardAmount)
          const newPoints = newBalance * 10000

          const { error: solverUpdateErr } = await supabaseAdmin
            .from('users')
            .update({
              sol_balance: newBalance,
              points: newPoints,
              updated_at: new Date()
            })
            .eq('id', record.user_id)

          if (solverUpdateErr) throw solverUpdateErr
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Submission marked as ${status}`,
      rewardAmount,
      pointsReward
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
