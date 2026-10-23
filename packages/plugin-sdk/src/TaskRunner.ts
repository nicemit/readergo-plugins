/**
 * TaskRunner Capability Interface
 * 
 * Allows plugins to run background tasks and scheduled jobs
 */

export interface TaskContext {
  pluginId: string;
  config: Record<string, any>;
}

export interface TaskRunner {
  /** Unique task runner identifier */
  id: string;

  /** Task runner name */
  name: string;

  /** Run task */
  run(context: TaskContext, params?: Record<string, any>): Promise<void>;

  /** Schedule task (cron expression) */
  schedule?(cronExpression: string, context: TaskContext): void;

  /** Cancel scheduled task */
  cancel?(taskId: string): void;
}

