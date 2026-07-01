import type { TaskBundle } from '../types';

export const MOCK_BUNDLES: TaskBundle[] = [
  {
    bundle_id: 'bundle_001',
    posted_by: '0xAbc...1234',
    status: 'active',
    created_at: '2026-06-30T08:12:00Z',
    tasks_data: [
      {
        sub_task_id: 'task_a1',
        type: 'SOCIAL',
        task_name: 'FOLLOW',
        target_url: 'https://twitter.com/raidx_xyz',
        count: 500,
        status: 'active',
      },
      {
        sub_task_id: 'task_a2',
        type: 'SOCIAL',
        task_name: 'RETWEET',
        target_url: 'https://twitter.com/raidx_xyz/status/987654321',
        count: 200,
        status: 'active',
      },
      {
        sub_task_id: 'task_a3',
        type: 'QUEST',
        question: 'What blockchain does RaidX run on?',
        options: ['Ethereum', 'Solana', 'Bitcoin'],
        allow_custom_answer: false,
        multiple_options_select: false,
        count: 100,
        status: 'active',
      },
    ],
  },
  {
    bundle_id: 'bundle_002',
    posted_by: '0xDef...5678',
    status: 'active',
    created_at: '2026-06-30T10:45:00Z',
    tasks_data: [
      {
        sub_task_id: 'task_b1',
        type: 'SOCIAL',
        task_name: 'TWEET',
        target_url: 'https://twitter.com/intent/tweet?text=gm+fam',
        count: 1000,
        status: 'active',
      },
      {
        sub_task_id: 'task_b2',
        type: 'QUEST',
        question: 'What is your favourite DeFi protocol?',
        options: ['Uniswap', 'Jupiter', 'Raydium', 'Other'],
        allow_custom_answer: true,
        multiple_options_select: false,
        count: 1000,
        status: 'active',
      },
    ],
  },
  {
    bundle_id: 'bundle_003',
    posted_by: '0x789...AbCd',
    status: 'submitted',
    created_at: '2026-06-29T15:00:00Z',
    tasks_data: [
      {
        sub_task_id: 'task_c1',
        type: 'SOCIAL',
        task_name: 'COMMENT',
        target_url: 'https://twitter.com/solana/status/11111',
        count: 300,
        status: 'active',
      },
      {
        sub_task_id: 'task_c2',
        type: 'SOCIAL',
        task_name: 'QUOTE',
        target_url: 'https://twitter.com/solana/status/11111',
        count: 150,
        status: 'active',
      },
    ],
  },
];
