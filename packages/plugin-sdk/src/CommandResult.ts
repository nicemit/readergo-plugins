/**
 * CommandResult - Standard return contract for all command handlers.
 * All commands MUST return this shape.
 */
export type CommandResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
