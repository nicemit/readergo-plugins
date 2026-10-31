import type { PluginContext } from './PluginContext';

/**
 * Agent / MCP Tool registration exposed by a plugin for AI agents and LLMs.
 */
export interface AgentToolRegistration {
    name: string;
    description: string;
    inputSchema: Record<string, unknown> & {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
    handler: (args: Record<string, unknown>, context?: PluginContext) => Promise<unknown> | unknown;
}
