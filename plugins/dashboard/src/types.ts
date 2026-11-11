export const DASHBOARD_TYPE = 'dashboard'
export const DASHBOARD_TITLE = 'Home'

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
