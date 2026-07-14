import { ipcMain } from 'electron'
import { userService } from '../services/user.service'

export function registerUserIpc(): void {
  ipcMain.handle('users:list', () => {
    return userService.list()
  })

  ipcMain.handle('users:create', (_event, payload) => {
    return userService.create(payload)
  })

  ipcMain.handle('users:update', (_event, id: string, payload) => {
    return userService.update(id, payload)
  })

  ipcMain.handle('users:delete', (_event, id: string) => {
    return userService.delete(id)
  })
}
