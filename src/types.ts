export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in-progress" | "done";

export const PRIORITIES: Priority[] = ["low", "medium", "high"];
export const STATUSES: Status[] = ["todo", "in-progress", "done"];

export interface Task {
  id: number;
  title: string;
  /** Short one-line description. */
  description: string;
  priority: Priority;
  labels: string[];
  /** Project-relative path to the extended-description markdown file. */
  path: string;
  status: Status;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/** On-disk shape of extras/tasks/data.json. */
export interface TaskData {
  nextId: number;
  tasks: Task[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  labels?: string[];
  status?: Status;
}

export interface TaskFilter {
  status?: Status;
  priority?: Priority;
  label?: string;
}
