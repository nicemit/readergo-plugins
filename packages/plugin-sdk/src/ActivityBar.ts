import { ComponentType, ReactNode } from 'react';
import type { PluginIcon } from './PluginContext';

/**
 * Props passed to Activity Bar panel components
 */
export interface ActivityBarPanelProps {
    isActive: boolean;
    onClose: () => void;
}

/**
 * Activity Bar Item capability
 * 
 * Plugins can register items to appear in the Activity Bar.
 * Each item can either trigger an action or toggle a panel.
 */
export interface ActivityBarItem {
    /** Unique identifier for this item */
    id: string;

    /** Icon from the plugin: a component, or a React node / legacy name string */
    icon: PluginIcon | ReactNode;

    /** Tooltip/label for the icon */
    label: string;

    /** Sort order (lower = higher in the bar, default: 100) */
    order?: number;

    /** Optional panel component to show when this item is active */
    panel?: ComponentType<ActivityBarPanelProps>;

    /** Action to trigger when clicked (if no panel) */
    onClick?: () => void;

    /**
     * If set, clicking this item creates a new note of this type.
     * The parent component handles the actual creation.
     */
    noteType?: string;

    /** 
     * Position in the activity bar
     * 'top' items appear at the top, 'bottom' items at the bottom
     */
    position?: 'top' | 'bottom';
}

/** Capability ID for Activity Bar items */
export const ACTIVITY_BAR_CAPABILITY = 'activity-bar-item';
