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
  /**
   * Ids of tasks that must be `done` before this one can be implemented.
   * Absent when the task is independently implementable.
   */
  dependsOn?: number[];
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
  dependsOn?: number[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  labels?: string[];
  status?: Status;
  /** Replace the dependency list; an empty array clears it. */
  dependsOn?: number[];
}

export interface TaskFilter {
  status?: Status;
  priority?: Priority;
  label?: string;
}
