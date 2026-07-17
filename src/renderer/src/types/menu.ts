// 'both' (default) shows for every business type. 'wholesale' items are hidden
// when the app is registered as a Retailer.
export type MenuVisibility = 'both' | 'wholesale' | 'retail'

export type BusinessTypeValue = 'WHOLESALE' | 'RETAIL'

export type AppMenuChild = {
  id: string
  label: string
  module: 'master' | 'transaction' | 'gst-estimate' | 'reports' | 'utility'
  visibility?: MenuVisibility
}

export type AppMenu = {
  id: string
  label: string
  children: AppMenuChild[]
}

export type WorkspaceTab = {
  id: string
  label: string
  module: string
}
