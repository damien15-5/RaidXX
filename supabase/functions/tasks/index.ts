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

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const wallet = url.searchParams.get('wallet')

      // Get all active quests
      const { data: tasks, error: tasksErr } = await supabaseAdmin
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

      if (tasksErr) throw tasksErr

      let userSubmissions: any[] = []
      if (wallet) {
        // Fetch user ID
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('wallet_address', wallet)
          .maybeSingle()

        if (user) {
          // Fetch user task records (submissions)
          const { data: records } = await supabaseAdmin
            .from('task_records')
            .select('parent_task_id, sub_task_id, status')
            .eq('user_id', user.id)

          if (records) {
            userSubmissions = records
          }
        }
      }

      // Fetch ALL task submission counts (for creators to track progress in real-time)
      const { data: allSubmissions } = await supabaseAdmin
        .from('task_records')
        .select('parent_task_id, sub_task_id')

      const submissionCounts: Record<string, Record<string, number>> = {}
      if (allSubmissions) {
        allSubmissions.forEach((s: any) => {
          if (!submissionCounts[s.parent_task_id]) {
            submissionCounts[s.parent_task_id] = {}
          }
          submissionCounts[s.parent_task_id][s.sub_task_id] = 
            (submissionCounts[s.parent_task_id][s.sub_task_id] || 0) + 1
        })
      }

      const formattedTasks = (tasks || []).map((t: any) => {
        const tSubmissions = userSubmissions.filter((s: any) => s.parent_task_id === t.id)
        const parentCounts = submissionCounts[t.id] || {}

        // Handle both old formats (direct array) and new formats (wrapper object)
        const rawData = t.tasks_data || []
        const isNewFormat = !Array.isArray(rawData) && rawData.tasks
        const subtasksArray = isNewFormat ? rawData.tasks : (Array.isArray(rawData) ? rawData : [])
        const activated = isNewFormat ? !!rawData.activated : true
        const cancelled = isNewFormat ? !!rawData.cancelled : false

        return {
          id: t.id,
          status: t.status,
          created_at: t.created_at,
          tasks_data: subtasksArray, // Always return as array for front-end compatibility
          activated,
          cancelled,
          posted_by: t.users?.wallet_address || 'Unknown',
          completion_counts: parentCounts,
          user_submissions: tSubmissions.map((s: any) => ({
            sub_task_id: s.sub_task_id,
            status: s.status
          }))
        }
      })

      return new Response(JSON.stringify({ success: true, tasks: formattedTasks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const wallet = body.wallet || body.wallet_address
      const action = body.action || 'create' // 'create' | 'start' | 'cancel'

      if (!wallet) {
        throw new Error('Wallet is required')
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

      if (action === 'create') {
        const { tasks_data } = body
        if (!tasks_data || !Array.isArray(tasks_data)) {
          throw new Error('tasks_data is required for create action')
        }

        // Save bundle as inactive initially (status = 'completed' so solvers don't see it yet)
        const initialTasksData = {
          tasks: tasks_data,
          activated: false,
          cancelled: false,
          budget_points: 0,
          spent_points: 0
        }

        const { data: task, error: insertError } = await supabaseAdmin
          .from('tasks')
          .insert({ 
            posted_by: user.id, 
            status: 'completed', // completed/inactive
            tasks_data: initialTasksData 
          })
          .select('*')
          .single()

        if (insertError) throw insertError

        return new Response(JSON.stringify({ success: true, task }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      } else if (action === 'start') {
        const { task_id } = body
        if (!task_id) {
          throw new Error('task_id is required for start action')
        }

        // Fetch task
        const { data: task, error: taskErr } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .eq('posted_by', user.id)
          .maybeSingle()

        if (taskErr) throw taskErr
        if (!task) {
          throw new Error('Task bundle not found or unauthorized')
        }

        const tasksDataObj = task.tasks_data || {}
        const isNewFormat = !Array.isArray(tasksDataObj) && tasksDataObj.tasks
        const activated = isNewFormat ? !!tasksDataObj.activated : false

        if (activated) {
          throw new Error('Task is already activated')
        }

        const subtasks = isNewFormat ? tasksDataObj.tasks : (Array.isArray(tasksDataObj) ? tasksDataObj : [])
        // Calculate points dynamically from front-end definitions
        const totalPoints = subtasks.reduce((sum: number, t: any) => sum + (Number(t.points) || 5) * (Number(t.count) || 100), 0)
        const solCost = totalPoints / 10000

        if (Number(user.sol_balance) < solCost) {
          throw new Error(`Insufficient balance. Starting this bundle costs ${solCost} SOL (${totalPoints} PTS). Your balance: ${user.sol_balance} SOL.`)
        }

        const newSolBalance = Number(user.sol_balance) - solCost
        const newPoints = newSolBalance * 10000

        // 1. Update user balance
        const { error: balErr } = await supabaseAdmin
          .from('users')
          .update({
            sol_balance: newSolBalance,
            points: newPoints,
            updated_at: new Date()
          })
          .eq('id', user.id)

        if (balErr) throw balErr

        // 2. Activate task
        const updatedTasksData = {
          tasks: subtasks,
          activated: true,
          cancelled: false,
          budget_points: totalPoints,
          spent_points: 0
        }

        const { error: taskUpdateErr } = await supabaseAdmin
          .from('tasks')
          .update({
            status: 'active', // visible to solvers
            tasks_data: updatedTasksData
          })
          .eq('id', task_id)

        if (taskUpdateErr) throw taskUpdateErr

        return new Response(JSON.stringify({ success: true, message: 'Task activated successfully', new_balance: newSolBalance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      } else if (action === 'cancel') {
        const { task_id } = body
        if (!task_id) {
          throw new Error('task_id is required for cancel action')
        }

        // Fetch task
        const { data: task, error: taskErr } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .eq('posted_by', user.id)
          .maybeSingle()

        if (taskErr) throw taskErr
        if (!task) {
          throw new Error('Task bundle not found or unauthorized')
        }

        if (task.status !== 'active') {
          throw new Error('Task is not active and cannot be cancelled')
        }

        const tasksDataObj = task.tasks_data || {}
        const isNewFormat = !Array.isArray(tasksDataObj) && tasksDataObj.tasks
        const subtasks = isNewFormat ? tasksDataObj.tasks : (Array.isArray(tasksDataObj) ? tasksDataObj : [])

        // Fetch submissions count for refund calculations
        const { data: submissions, error: subErr } = await supabaseAdmin
          .from('task_records')
          .select('sub_task_id')
          .eq('parent_task_id', task_id)

        if (subErr) throw subErr

        const submissionCounts = (submissions || []).reduce((acc: Record<string, number>, s: any) => {
          acc[s.sub_task_id] = (acc[s.sub_task_id] || 0) + 1
          return acc
        }, {})

        // Calculate refund points
        let refundedPoints = 0
        for (const t of subtasks) {
          const completions = submissionCounts[t.sub_task_id] || 0
          const remainingSlots = Math.max(0, (Number(t.count) || 100) - completions)
          refundedPoints += remainingSlots * (Number(t.points) || 5)
        }

        const refundSol = refundedPoints / 10000
        const newSolBalance = Number(user.sol_balance) + refundSol
        const newPoints = newSolBalance * 10000

        // 1. Update user balance
        const { error: balErr } = await supabaseAdmin
          .from('users')
          .update({
            sol_balance: newSolBalance,
            points: newPoints,
            updated_at: new Date()
          })
          .eq('id', user.id)

        if (balErr) throw balErr

        // 2. Mark task bundle as cancelled (completed status in db)
        const updatedTasksData = {
          tasks: subtasks,
          activated: true,
          cancelled: true,
          refunded_points: refundedPoints
        }

        const { error: taskUpdateErr } = await supabaseAdmin
          .from('tasks')
          .update({
            status: 'completed', // completed/inactive
            tasks_data: updatedTasksData
          })
          .eq('id', task_id)

        if (taskUpdateErr) throw taskUpdateErr

        return new Response(JSON.stringify({ success: true, message: 'Task cancelled and remaining budget refunded', refund_sol: refundSol, new_balance: newSolBalance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      } else {
        throw new Error(`Action ${action} not supported`)
      }
    } else {
      throw new Error(`Method ${req.method} not supported`)
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
