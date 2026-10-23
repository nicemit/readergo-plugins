/**
 * ExtensionSlot Capability Interface
 * 
 * Allows plugins to inject React components into specific labeled slots in the application UI
 */

import { ComponentType } from 'react';

export interface ExtensionSlotProvider {
    /** Unique identifier for this specific provider registration */
    id: string;

    /** The ID of the slot this component injects into (e.g., "editor-toolbar-left") */
    slotId: string;

    /** The ID mapping to a Host React component to render in the slot */
    componentId: string;

    /** Order to sort multiple components in the same slot (lower renders first) */
    order?: number;
}
