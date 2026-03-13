export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  parent_id: string | null;
  created_at: string;
}

export interface TaskInsert {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  parent_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  parent_id?: string | null;
}
