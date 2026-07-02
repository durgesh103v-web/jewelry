/// <reference types="vite/client" />

type AccountGroupPayload = {
  groupName: string
  groupType: string
  description: string
  active: boolean
}

type AccountGroupRecord = AccountGroupPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

interface Window {
  api: {
    accountGroups: {
      list: () => Promise<AccountGroupRecord[]>
      create: (payload: AccountGroupPayload) => Promise<AccountGroupRecord>
      update: (id: string, payload: AccountGroupPayload) => Promise<AccountGroupRecord>
      remove: (id: string) => Promise<{ success: boolean }>
    }
  }
}
