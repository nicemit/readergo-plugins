/**
 * SidebarPanel Capability Interface
 * 
 * Allows plugins to add panels to the left or right sidebar
 */

import { PluginContext } from './PluginContext';

export interface SidebarPanel {
  /** Unique panel identifier */
  id: string;

  /** Panel name */
  name: string;

  /** Panel icon (optional) */
  icon?: React.ComponentType<{ className?: string }>;

  /** Render function */
  render(props: {
    noteId: string | null;
    context: PluginContext;
    onNavigateToNote?: (noteId: string) => void;
    onCreateNote?: (title: string) => void;
  }): React.ReactNode;

  /** Position preference */
  position?: 'left' | 'right';

  /** Display order (lower = higher priority) */
  order?: number;
}

