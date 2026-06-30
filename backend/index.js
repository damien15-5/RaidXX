import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bs58 from 'bs58'
import { createClient } from '@supabase/supabase-js'
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 3001

// 1. Supabase setup
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 2. Solana setup
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9', 'confirmed')

// Parse private key dynamically
let treasuryKeypair = null
const rawPrivateKey = process.env.TREASURY_PRIVATE_KEY

if (rawPrivateKey && rawPrivateKey !== 'your-solana-private-key-base58-or-json-array') {
  try {
    if (rawPrivateKey.trim().startsWith('[')) {
      // Parse JSON array representation
      const secretKey = Uint8Array.from(JSON.parse(rawPrivateKey))
      treasuryKeypair = Keypair.fromSecretKey(secretKey)
    } else {
      // Parse base58 representation
      const secretKey = bs58.decode(rawPrivateKey.trim())
      treasuryKeypair = Keypair.fromSecretKey(secretKey)
    }
    console.log(`Treasury wallet initialized. Public Key: ${treasuryKeypair.publicKey.toString()}`)
  } catch (error) {
    console.error('Failed to parse TREASURY_PRIVATE_KEY:', error.message)
  }
} else {
  console.warn('TREASURY_PRIVATE_KEY is not configured. Faucet and Withdrawals will fail.')
}

// REST endpoints

// Get user state (balances, points, and transactions)
app.get('/api/user/:wallet', async (req, res) => {
  const { wallet } = req.params
  try {
    // 1. Get or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle()

    if (userError) throw userError

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet, sol_balance: 0.0, points: 0.0 })
        .select('*')
        .single()

      if (createError) throw createError
      user = newUser
    }

    // 2. Get user transactions
    const { data: txs, error: txsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_address', wallet)
      .order('created_at', { ascending: false })

    if (txsError) throw txsError

    res.json({
      success: true,
      user,
      transactions: txs || [],
      treasuryAddress: treasuryKeypair ? treasuryKeypair.publicKey.toString() : 'Not configured'
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Faucet endpoint (backend sends 0.2 SOL to connected wallet)
app.post('/api/faucet', async (req, res) => {
  const { wallet } = req.body

  if (!treasuryKeypair) {
    return res.status(500).json({ success: false, message: 'Treasury wallet private key is not configured on the backend.' })
  }

  try {
    console.log(`Faucet triggered: sending 0.2 SOL to ${wallet}`)
    const recipientPubKey = new PublicKey(wallet)

    // Check treasury balance
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
    const faucetAmountLamports = 0.3 * LAMPORTS_PER_SOL

    if (treasuryBalance < faucetAmountLamports + 5000) {
      return res.status(400).json({ success: false, message: 'Insufficient funds in treasury wallet.' })
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubKey,
        lamports: faucetAmountLamports
      })
    )

    // Send and confirm
    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])
    console.log(`Faucet transaction successful! Signature: ${signature}`)

    // Record transaction in Supabase
    // 1. Get or create user
    let { data: user } = await supabase.from('users').select('*').eq('wallet_address', wallet).maybeSingle()
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet, sol_balance: 0.0, points: 0.0 })
        .select('*')
        .single()
      if (createError) throw createError
      user = newUser
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      wallet_address: wallet,
      type: 'faucet',
      status: 'confirmed',
      amount: 0.3,
      signature
    })

    res.json({ success: true, signature, amount: 0.3 })
  } catch (error) {
    console.error('Faucet error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Verify deposit endpoint
app.post('/api/deposit', async (req, res) => {
  const { wallet, signature, amount } = req.body

  if (!signature || !amount) {
    return res.status(400).json({ success: false, message: 'Signature and amount are required' })
  }

  try {
    console.log(`Verifying deposit signature: ${signature} for ${amount} SOL`)

    // 1. Fetch transaction from Devnet Helius REST API
    const fetchRes = await fetch(`https://devnet.helius-rpc.com/v0/transactions/?api-key=56174be0-31ca-4e07-913b-a3f8fa4aa0e9`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [signature] })
    })
    const txData = await fetchRes.json()

    if (!txData || txData.length === 0) {
      return res.status(400).json({ success: false, message: 'Transaction not found on chain. Please wait a few seconds.' })
    }

    const tx = txData[0]

    // 2. Perform on-chain validation checks
    if (tx.transactionError) {
      return res.status(400).json({ success: false, message: 'Transaction failed on chain.' })
    }

    if (!treasuryKeypair) {
      return res.status(500).json({ success: false, message: 'Treasury wallet address is not configured.' })
    }

    const treasuryAddress = treasuryKeypair.publicKey.toString()

    // Find the transfer to treasury from the user
    const transfer = tx.nativeTransfers?.find(t => 
      t.fromUserAccount === wallet && 
      t.toUserAccount === treasuryAddress
    )

    if (!transfer) {
      return res.status(400).json({ success: false, message: 'No transfer to treasury found in this transaction.' })
    }

    // Validate transferred amount
    const diff = transfer.amount / LAMPORTS_PER_SOL

    // We allow a tiny precision margin
    if (Math.abs(diff - amount) > 0.001) {
      return res.status(400).json({ success: false, message: `Transferred amount on-chain (${diff}) does not match requested deposit (${amount}).` })
    }

    // 3. Update DB
    // Calculate points (10000 points per 1 SOL)
    const pointsGranted = amount * 10000

    // Get user
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .single()

    if (fetchErr) throw fetchErr

    const newBalance = Number(user.sol_balance) + Number(amount)
    const newPoints = newBalance * 10000

    // Update user balance/points
    const { error: updateErr } = await supabase
      .from('users')
      .update({ sol_balance: newBalance, points: newPoints, updated_at: new Date() })
      .eq('wallet_address', wallet)

    if (updateErr) throw updateErr

    // Insert transaction
    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_address: wallet,
        type: 'deposit',
        status: 'confirmed',
        amount,
        points: pointsGranted,
        signature
      })

    if (txErr) throw txErr

    res.json({
      success: true,
      message: 'Deposit verified and credited successfully!',
      newBalance,
      pointsGranted
    })
  } catch (error) {
    console.error('Verification error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Withdraw endpoint
app.post('/api/withdraw', async (req, res) => {
  const { wallet, amount } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' })
  }

  if (!treasuryKeypair) {
    return res.status(500).json({ success: false, message: 'Treasury private key not configured. Cannot process withdrawal.' })
  }

  try {
    // Fixed withdrawal fee of 0.04 SOL
    const fee = 0.04
    const totalDeduction = Number(amount) + fee

    // 1. Check user balance in Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle()

    if (userError) throw userError
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found in system.' })
    }

    if (Number(user.sol_balance) < totalDeduction) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Requested: ${amount} SOL + Fee: ${fee} SOL (Total: ${totalDeduction.toFixed(4)} SOL). Your balance: ${user.sol_balance} SOL.`
      })
    }

    // Constraint: Max withdrawal rule if balance is exactly 3 SOL (withdraw must not pass 2.95)
    if (Number(user.sol_balance) === 3 && Number(amount) > 2.95) {
      return res.status(400).json({ success: false, message: 'Withdrawing with a balance of exactly 3 SOL cannot exceed a maximum request of 2.95 SOL.' })
    }

    console.log(`Withdrawal authorized: sending ${amount} SOL to ${wallet}. Fee charged: ${fee} SOL.`)

    // 2. Perform Solana Devnet transfer from Treasury to User
    const recipientPubKey = new PublicKey(wallet)

    // Check treasury balance
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey)
    const withdrawalAmountLamports = Math.floor(amount * LAMPORTS_PER_SOL)

    if (treasuryBalance < withdrawalAmountLamports + 5000) {
      return res.status(500).json({ success: false, message: 'Backend treasury has insufficient on-chain SOL to fulfill the request.' })
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubKey,
        lamports: withdrawalAmountLamports
      })
    )

    // Send and confirm
    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair])
    console.log(`Withdrawal transaction successful! Signature: ${signature}`)

    // 3. Update Supabase balance & points (10000 points per 1 SOL)
    const pointsDeducted = amount * 10000
    const newBalance = Number(user.sol_balance) - totalDeduction
    const newPoints = newBalance * 10000

    const { error: updateErr } = await supabase
      .from('users')
      .update({ sol_balance: newBalance, points: newPoints, updated_at: new Date() })
      .eq('wallet_address', wallet)

    if (updateErr) throw updateErr

    // Update platform/treasury wallet balance in DB (credit the fee)
    const treasuryAddress = treasuryKeypair.publicKey.toString()
    const { data: treasuryUser } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', treasuryAddress)
      .maybeSingle()

    if (treasuryUser) {
      await supabase
        .from('users')
        .update({
          sol_balance: Number(treasuryUser.sol_balance) + fee,
          updated_at: new Date()
        })
        .eq('wallet_address', treasuryAddress)
    } else {
      await supabase
        .from('users')
        .insert({
          wallet_address: treasuryAddress,
          sol_balance: fee
        })
    }

    // Insert transaction
    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_address: wallet,
        type: 'withdrawal',
        status: 'confirmed',
        amount,
        fee,
        points: -pointsDeducted,
        signature
      })

    if (txErr) throw txErr

    res.json({
      success: true,
      signature,
      amount,
      fee,
      newBalance,
      newPoints
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// === QUEST / TASK SYSTEM ENDPOINTS ===

// Get all active quests
app.get('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, tasks: data || [] })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create a new quest bundle
app.post('/api/tasks', async (req, res) => {
  const { wallet, tasks_data } = req.body
  if (!wallet || !tasks_data) {
    return res.status(400).json({ success: false, message: 'Wallet and tasks_data are required' })
  }
  try {
    let { data: user } = await supabase.from('users').select('*').eq('wallet_address', wallet).maybeSingle()
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet, sol_balance: 0.0, points: 0.0 })
        .select('*')
        .single()
      if (createError) throw createError
      user = newUser
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ posted_by: user.id, tasks_data })
      .select('*')
      .single()
    if (error) throw error

    res.json({ success: true, task })
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Submit proof of completion for a subtask
app.post('/api/tasks/submit', async (req, res) => {
  const { wallet, parent_task_id, sub_task_id, proof_data } = req.body
  if (!wallet || !parent_task_id || !sub_task_id) {
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }
  try {
    let { data: user } = await supabase.from('users').select('*').eq('wallet_address', wallet).maybeSingle()
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet, sol_balance: 0.0, points: 0.0 })
        .select('*')
        .single()
      if (createError) throw createError
      user = newUser
    }

    const { data: record, error } = await supabase
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
    if (error) throw error

    res.json({ success: true, record })
  } catch (error) {
    console.error('Error submitting proof:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Verify/approve/reject a submission
app.post('/api/tasks/verify', async (req, res) => {
  const { record_id, status } = req.body // status: 'successful' or 'failed'
  if (!record_id || !['successful', 'failed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid verification status' })
  }
  try {
    const { data: record, error: fetchError } = await supabase
      .from('task_records')
      .select('*, parent_task_id(tasks_data)')
      .eq('id', record_id)
      .single()

    if (fetchError || !record) throw new Error('Record not found')
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Submission already processed' })
    }

    const { error: updateError } = await supabase
      .from('task_records')
      .update({ status })
      .eq('id', record_id)
    if (updateError) throw updateError

    let rewardAmount = 0
    let pointsReward = 0

    if (status === 'successful') {
      const tasksData = record.parent_task_id.tasks_data
      const subTask = tasksData.tasks?.find(t => t.id === record.sub_task_id)
      if (subTask) {
        rewardAmount = subTask.rewardAmount || 0.05
        pointsReward = subTask.pointsReward || 500
      }

      if (rewardAmount > 0 || pointsReward > 0) {
        const { data: solver } = await supabase.from('users').select('*').eq('id', record.user_id).single()
        if (solver) {
          const newBalance = Number(solver.sol_balance) + Number(rewardAmount)
          const newPoints = newBalance * 10000
          await supabase
            .from('users')
            .update({ sol_balance: newBalance, points: newPoints, updated_at: new Date() })
            .eq('id', record.user_id)
        }
      }
    }

    res.json({
      success: true,
      message: `Submission marked as ${status}`,
      rewardAmount,
      pointsReward
    })
  } catch (error) {
    console.error('Error verifying submission:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})


app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`)
})
