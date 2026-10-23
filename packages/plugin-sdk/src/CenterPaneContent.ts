/**
 * CenterPaneContent Capability Interface
 * 
 * Allows plugins to render content in the center pane (dashboard/editor area)
 */

import { PluginContext } from './PluginContext';

export interface CenterPaneContent {
  /** Unique content identifier */
  id: string;

  /** Content name */
  name: string;

  /** Icon (optional) */
  icon?: React.ComponentType<{ className?: string }>;

  /** Render function for dashboard view */
  renderDashboard?(props: {
    context: PluginContext;
    recentNotes: Array<{
      id: string;
      title: string;
      content: string;
      updatedAt: Date;
    }>;
  }): React.ReactNode;

  /** Render function for editor view */
  renderEditor?(props: {
    context: PluginContext;
    noteId: string | null;
    noteContent: string;
    noteTitle: string;
  }): React.ReactNode;

  /** View modes this content supports */
  viewModes?: ('dashboard' | 'editor')[];

  /** Display order (lower = higher priority) */
  order?: number;
}

