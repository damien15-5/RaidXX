-- 1. ENUMS
CREATE TYPE submission_status AS ENUM ('pending', 'successful', 'failed');
CREATE TYPE task_bundle_status AS ENUM ('active', 'completed');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'faucet');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');

-- 2. USERS (Wallet profiles & Balances)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR UNIQUE NOT NULL,
    sol_balance DECIMAL DEFAULT 0.0,
    points DECIMAL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRANSACTIONS
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL NOT NULL,
    fee DECIMAL DEFAULT 0.0,
    points DECIMAL DEFAULT 0.0,
    signature VARCHAR UNIQUE NOT NULL,
    status transaction_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASKS (The Task/Quest Bundles)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by UUID REFERENCES users(id) ON DELETE CASCADE,
    status task_bundle_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tasks_data JSONB NOT NULL
);

-- 5. TASK RECORDS (User Submissions)
CREATE TABLE task_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    sub_task_id VARCHAR NOT NULL, 
    status submission_status DEFAULT 'pending',
    proof_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, parent_task_id, sub_task_id) 
);

-- 6. RLS (Row Level Security) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_records ENABLE ROW LEVEL SECURITY;

-- Allow public read of users, tasks
CREATE POLICY "Public profiles are viewable by everyone." ON users FOR SELECT USING (true);
CREATE POLICY "Active tasks are viewable by everyone." ON tasks FOR SELECT USING (true);

-- Allow any anon to insert a new wallet user (wallet-based auth — no Supabase Auth session)
CREATE POLICY "Anyone can register a wallet address." ON users FOR INSERT WITH CHECK (true);

-- Users can update their own row (matched by wallet_address, no auth.uid needed)
CREATE POLICY "Wallet owners can update their own profile." ON users FOR UPDATE USING (true);


-- Users can insert their own task records
CREATE POLICY "Users can insert their own task records." ON task_records FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions." ON transactions FOR SELECT USING (auth.uid() = user_id);

-- 7. FUNCTION & TRIGGER TO UPDATE UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
