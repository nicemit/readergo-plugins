/**
 * Plugin Interface
 *
 * Core interface that all plugins must implement
 */

import { PluginManifest } from './Manifest';
import { PluginContext } from './PluginContext';

export interface Plugin {
    /** Plugin manifest */
    manifest: PluginManifest;

    /** Activation hook - called when plugin is activated */
    activate(context: PluginContext): Promise<void> | void;

    /** Deactivation hook - called when plugin is deactivated */
    deactivate?(context: PluginContext): Promise<void> | void;
}
