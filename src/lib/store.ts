import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { slugify } from "./slug.ts";
import type {
  CreateTaskInput,
  Task,
  TaskData,
  TaskFilter,
  UpdateTaskInput,
} from "../types.ts";

const EMPTY: TaskData = { nextId: 1, tasks: [] };

/**
 * The only module that reads or writes extras/tasks/data.json.
 * Constructed with the absolute path to data.json so it is trivially testable
 * against a temp directory.
 */
export class TaskStore {
  private readonly dataFile: string;

  constructor(dataFile: string) {
    this.dataFile = dataFile;
  }

  private read(): TaskData {
    if (!existsSync(this.dataFile)) return structuredClone(EMPTY);
    const parsed = JSON.parse(readFileSync(this.dataFile, "utf8")) as Partial<TaskData>;
    return {
      nextId: parsed.nextId ?? 1,
      tasks: parsed.tasks ?? [],
    };
  }

  private write(data: TaskData): void {
    mkdirSync(dirname(this.dataFile), { recursive: true });
    writeFileSync(this.dataFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  list(filter: TaskFilter = {}): Task[] {
    return this.read().tasks.filter((t) => {
      if (filter.status && t.status !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (filter.label && !t.labels.includes(filter.label)) return false;
      return true;
    });
  }

  get(id: number): Task | undefined {
    return this.read().tasks.find((t) => t.id === id);
  }

  create(input: CreateTaskInput): Task {
    const data = this.read();
    const id = data.nextId;
    const now = new Date().toISOString();
    const task: Task = {
      id,
      title: input.title,
      description: input.description ?? "",
      priority: input.priority ?? "medium",
      labels: input.labels ?? [],
      path: `extras/tasks/${id}-${slugify(input.title)}.md`,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    };
    if (input.dependsOn && input.dependsOn.length > 0) task.dependsOn = input.dependsOn;
    data.tasks.push(task);
    data.nextId = id + 1;
    this.write(data);
    return task;
  }

  update(id: number, patch: UpdateTaskInput): Task | undefined {
    const data = this.read();
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.description !== undefined) task.description = patch.description;
    if (patch.priority !== undefined) task.priority = patch.priority;
    if (patch.labels !== undefined) task.labels = patch.labels;
    if (patch.status !== undefined) task.status = patch.status;
    if (patch.dependsOn !== undefined) {
      if (patch.dependsOn.length > 0) task.dependsOn = patch.dependsOn;
      else delete task.dependsOn;
    }
    task.updatedAt = new Date().toISOString();
    this.write(data);
    return task;
  }

  delete(id: number): Task | undefined {
    const data = this.read();
    const index = data.tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const [removed] = data.tasks.splice(index, 1);
    this.write(data);
    return removed;
  }
}
