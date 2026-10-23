/**
 * ExtensionSlot Capability Interface
 * 
 * Allows plugins to inject React components into specific labeled slots in the application UI
 */

import { ComponentType } from 'react';

export interface ExtensionSlotProvider {
    /** Unique identifier for this specific provider registration */
    id: string;

    /** The ID of the slot this component injects into (e.g., "editor-toolbar") */
    slotId: string;

    /** React component to render directly in the slot */
    component?: ComponentType<any>;

    /** Legacy ID mapping to a component */
    componentId?: string;

    /** Order to sort multiple components in the same slot (lower renders first) */
    order?: number;
}
