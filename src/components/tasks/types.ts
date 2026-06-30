/**
 * types.ts
 * --------
 * All TypeScript types shared across TaskUpload and TaskList.
 * Edit this file to add new task types or change the bundle shape.
 */

// Social task kinds
export type SocialTaskName =
  | 'FOLLOW'
  | 'RETWEET'
  | 'COMMENT'
  | 'TWEET'
  | 'QUOTE';

// A single social sub-task (follow, retweet, etc.)
export interface SocialSubTask {
  sub_task_id: string; // unique ID for this sub-task
  type: 'SOCIAL';
  task_name: SocialTaskName;
  target_url: string; // the X / Twitter URL to act on
  count: number;                // how many users should do this
  status: 'active';
}

// A single quest sub-task (question + options)
export interface QuestSubTask {
  sub_task_id: string;          // unique ID for this sub-task
  type: 'QUEST';
  question: string;
  options: string[];            // answer choices
  allow_custom_answer: boolean; // can users type their own answer?
  multiple_options_select: boolean; // can users pick more than one?
  count: number;                // how many users should answer
  status: 'active';
}

// Union of both sub-task types
export type SubTask = SocialSubTask | QuestSubTask;

// A full task bundle (maps to the `tasks` table in Supabase)
export interface TaskBundle {
  bundle_id: string;            // unique ID for the whole bundle (maps to tasks.id)
  posted_by: string;            // wallet address of creator
  status: 'active' | 'submitted';
  created_at: string;           // ISO timestamp
  tasks_data: SubTask[];        // the ordered list of sub-tasks
}
