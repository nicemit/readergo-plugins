import { PluginManifest } from './Manifest';
import { ExtensionDescriptor } from './ExtensionDescriptor';
import { StandardCapabilities } from './Capabilities';
import { CommandRegistration } from './Command';
import { EditorRegistration, EditorCapability } from './Document';
import { PlaceContribution } from './ContributionPlace';

import type { ComponentType } from 'react';
import { Document } from './Document';

/** Icon a plugin hands the host. The host renders it; it does not pick one from a name map. */
export type PluginIcon = ComponentType<{ className?: string }>;

export interface DocumentTypeDefinition {
    type: string;
    label: string;
    icon?: string | PluginIcon;
    create: () => Partial<Document>;
    /** Filename suffixes this type opens in a folder Space (e.g. `['.md']`, `['.epub']`). */
    extensions?: string[];
    /** MIME types this type claims on drop or file pick (e.g. `['text/markdown']`). */
    mimeTypes?: string[];
}

export interface PluginContext {
    /** Metadata about the running plugin */
    readonly manifest: Readonly<PluginManifest>;

    /** Remote logging bridge */
    log: {
        info(msg: string, ...args: unknown[]): Promise<void>;
        warn(msg: string, ...args: unknown[]): Promise<void>;
        error(msg: string, ...args: unknown[]): Promise<void>;
        debug?(msg: string, ...args: unknown[]): Promise<void>;
    };

    /** 
     * Asynchronous capability acquisition. Returns a strongly typed standard capability proxy.
     * 
     * ## Capability Version Resolution
     * If no version is requested, the platform will assign the highest
     * compatible version it guarantees stability for.
     * 
     * Plugin authors should explicitly request versions when they rely on
     * specific API behavior.
     */
    getCapability<K extends keyof StandardCapabilities>(capabilityId: K, options?: { version?: number }): Promise<StandardCapabilities[K] | null>;
    getCapability<T = any>(capabilityId: Exclude<string, keyof StandardCapabilities>, options?: { version?: number }): Promise<T | null>;

    /** Register an extension descriptor (UI, Command, etc.) with the Host */
    registerExtension(descriptor: ExtensionDescriptor): Promise<void>;

    /** Register a custom Document schema for platform extension */
    registerDocumentType(definition: DocumentTypeDefinition): Promise<void>;

    /** Register a capability provider (Service, API, Data Source, etc.) */
    registerCapability<T = any>(capabilityId: string, provider: T): Promise<void>;

    /**
     * Register a Runtime filesystem Space backend (SFTP, S3, ...).
     * Host opens note/folder providers; the Runtime plugin serves filesystem ops.
     */
    registerRuntimeFilesystemBackend?(descriptor: {
        id: string;
        name: string;
        description?: string;
        configFields?: Array<{
            key: string;
            label: string;
            kind: 'text' | 'path' | 'directory-picker';
            required?: boolean;
            placeholder?: string;
        }>;
    }): Promise<void>;

    /** Register a dynamic document editor component */
    registerEditor(registration: EditorRegistration): Promise<void>;

    /** Register a custom loading skeleton for a Space backend */
    registerSpaceLoadingComponent?(backendId: string, component: ComponentType<any>): void;

    /** Register an active capability instance (e.g., when an editor mounts) */
    registerActiveCapability<T extends EditorCapability>(id: string, capability: T): () => void;

    /** Retrieve an active capability instance */
    getActiveCapability<T extends EditorCapability>(id: string): T | undefined;

    /** Register an editor capability with multi-instance support */
    registerEditorCapability(instanceId: string, capability: EditorCapability): () => void;

    /** Retrieve an editor capability with multi-instance context */
    getActiveEditor(context?: { editorInstanceId?: string }): EditorCapability | undefined;

    /** Set active editor instance for focus tracking */
    setActiveEditor(instanceId: string): void;

    /** Register a command that can be invoked from UI, palette, shortcuts, or other plugins */
    registerCommand(command: CommandRegistration): Promise<void>;

    /**
     * Register a Contribution Places item (filtered UI contribution).
     * Hosts resolve matching items via PluginManager.resolveContributions.
     */
    registerContribution(contribution: PlaceContribution): Promise<void>;

    /** Execute a registered command by ID */
    executeCommand(commandId: string, payload?: unknown): Promise<any>;

    /** Event bus for Pub/Sub across the platform */
    subscribe(event: string, handler: (payload: unknown) => void): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<void>;
    emit(event: string, payload: unknown): Promise<void>;

    /** Configuration access */
    getConfig<T = any>(key: string, defaultValue?: T): Promise<T | undefined>;
    setConfig(key: string, value: any): Promise<void>;

    /** Storage access */
    storage: {
        get<T>(key: string): Promise<T | null>;
        set<T>(key: string, value: T): Promise<void>;
        remove(key: string): Promise<void>;
        clear(): Promise<void>;
    };

    hasPermission(permission: string): Promise<boolean>;
}
