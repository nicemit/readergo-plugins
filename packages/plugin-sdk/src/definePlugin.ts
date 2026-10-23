import { PluginManifest } from './Manifest';
import { PluginContext } from './PluginContext';

export interface PluginDefinition {
    manifest: PluginManifest;
    setup: (ctx: PluginContext) => Promise<(() => Promise<void>) | void>;
}

export function definePlugin(definition: PluginDefinition): PluginDefinition {
    return definition;
}
