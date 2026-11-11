export const DASHBOARD_TYPE = 'dashboard'
/** Tab / document title for the singleton overview doc. */
export const DASHBOARD_TITLE = 'Home'
/** In-editor kind label - what this dashboard is. */
export const DASHBOARD_KIND = 'Workspace overview'
export const DASHBOARD_KIND_BLURB =
  'A live overview of the active space: recent work, document mix, and quick create.'

export type DashboardNote = {
  id: string
  title: string
  content?: string
  type?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  folders?: Array<{ folderId: string }>
  metadata?: Record<string, unknown>
}
