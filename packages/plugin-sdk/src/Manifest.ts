import { Permission } from './Permission';

export type PluginCategory = 'editor' | 'storage' | 'auth' | 'ai' | 'feature' | 'utility' | 'other';

export interface PluginManifest {
    id: string;
    name: string;
    category?: PluginCategory;
    /** Marks a provider as core platform infrastructure (not removable) */
    providerType?: 'core' | 'plugin';
    version: string;
    author?: string;
    description?: string;
    homepage?: string;
    provides: string[] | readonly string[];
    requires?: string[] | readonly string[];
    /**
     * Plugin source location
     */
    source?: 'bundled' | 'external';
    /**
     * Plugin trust tier
     */
    trust?: 'trusted' | 'untrusted';
    /**
     * Execution context (where does this code run natively)
     */
    runtime?: 'local' | 'worker';
    /** Which package halves this plugin ships. Either half may be absent. */
    components?: {
        ui?: string;
        runtime?: string;
    };
    permissions: Permission[] | readonly Permission[];
    platforms?: ('web' | 'mobile' | 'desktop')[] | readonly ('web' | 'mobile' | 'desktop')[];
    configSchema?: Record<string, any>;
}
