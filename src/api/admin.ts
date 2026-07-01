import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Admin client that bypasses RLS policies
export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export interface AdminStats {
  users: any[];
  tasks: any[];
  transactions: any[];
  submissions: any[];
}

// ── Fetch All Admin Stats Serverless ──────────────────────────────────────────
export const fetchAdminStats = async (): Promise<AdminStats> => {
  // 1. Fetch Users
  const { data: users, error: usersErr } = await adminSupabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersErr) throw usersErr;

  // 2. Fetch Tasks (Bundles)
  const { data: tasks, error: tasksErr } = await adminSupabase
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
    .order('created_at', { ascending: false });

  if (tasksErr) throw tasksErr;

  // 3. Fetch Transactions
  const { data: transactions, error: txsErr } = await adminSupabase
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
    .order('created_at', { ascending: false });

  if (txsErr) throw txsErr;

  // 4. Fetch Submissions (Task Records)
  const { data: submissions, error: subErr } = await adminSupabase
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
    .order('created_at', { ascending: false });

  if (subErr) throw subErr;

  // Format Tasks to match frontend expectations
  const formattedTasks = (tasks || []).map((t: any) => ({
    id: t.id,
    status: t.status,
    created_at: t.created_at,
    tasks_data: t.tasks_data,
    posted_by: t.users?.wallet_address || 'Unknown'
  }));

  // Format Submissions to map subtask details
  const formattedSubmissions = (submissions || []).map((r: any) => {
    const tasksData = r.tasks?.tasks_data;
    const subTasks = Array.isArray(tasksData) 
      ? tasksData 
      : (tasksData?.tasks || tasksData?.subTasks || []);
    const subTask = subTasks.find((t: any) => t.sub_task_id === r.sub_task_id || t.id === r.sub_task_id);

    return {
      id: r.id,
      sub_task_id: r.sub_task_id,
      parent_task_id: r.parent_task_id,
      status: r.status,
      proof_data: r.proof_data,
      created_at: r.created_at,
      wallet_address: r.users?.wallet_address || 'Unknown',
      sub_task: subTask || null
    };
  });

  return {
    users: users || [],
    tasks: formattedTasks,
    transactions: transactions || [],
    submissions: formattedSubmissions
  };
};

// ── Verify Submission Serverless ──────────────────────────────────────────────
export const verifySubmissionServerless = async (
  recordId: string,
  status: 'successful' | 'failed'
): Promise<{ success: boolean; rewardAmount: number; pointsReward: number; message: string }> => {
  
  // 1. Fetch the task record with parent task details
  const { data: record, error: fetchError } = await adminSupabase
    .from('task_records')
    .select('*, parent_task_id:parent_task_id(tasks_data)')
    .eq('id', recordId)
    .single();

  if (fetchError || !record) {
    throw new Error('Submission record not found.');
  }

  if (record.status !== 'pending') {
    throw new Error('This submission has already been processed.');
  }

  // 2. Update status of the task record
  const { error: updateError } = await adminSupabase
    .from('task_records')
    .update({ status })
    .eq('id', recordId);

  if (updateError) throw updateError;

  let rewardAmount = 0;
  let pointsReward = 0;

  if (status === 'successful') {
    // Find subtask rewards
    const tasksData = record.parent_task_id?.tasks_data;
    const subTasks = Array.isArray(tasksData) 
      ? tasksData 
      : (tasksData?.tasks || tasksData?.subTasks || []);
    const subTask = subTasks.find((t: any) => t.sub_task_id === record.sub_task_id || t.id === record.sub_task_id);
    
    if (subTask) {
      pointsReward = Number(subTask.points) || 5; // default 5 PTS
      rewardAmount = pointsReward / 10000; // 10,000 PTS = 1.0 SOL
    }

    if (rewardAmount > 0 || pointsReward > 0) {
      const { data: solver, error: solverErr } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', record.user_id)
        .single();

      if (solverErr) throw solverErr;

      if (solver) {
        const newBalance = Number(solver.sol_balance) + Number(rewardAmount);
        const newPoints = newBalance * 10000;
        
        const { error: solverUpdateErr } = await adminSupabase
          .from('users')
          .update({
            sol_balance: newBalance,
            points: newPoints,
            updated_at: new Date()
          })
          .eq('id', record.user_id);

        if (solverUpdateErr) throw solverUpdateErr;
      }
    }
  }

  return {
    success: true,
    rewardAmount,
    pointsReward,
    message: `Submission marked as ${status} successfully.`
  };
};
