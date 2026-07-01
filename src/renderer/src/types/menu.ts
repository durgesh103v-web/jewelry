export type AppMenuChild = {
  id: string
  label: string
  module: 'master' | 'transaction' | 'gst-estimate' | 'reports' | 'utility'
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
