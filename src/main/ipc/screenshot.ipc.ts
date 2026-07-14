import { app, BrowserWindow, ipcMain, shell } from 'electron'
import dayjs from 'dayjs'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

// Mirrors the convention used by getDatabasePath() in database/connection.ts:
// a dedicated sub-folder under Electron's per-user application data directory.
function getScreenshotsDir(): string {
  const dir = join(app.getPath('userData'), 'screenshots')

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  return dir
}

export function registerScreenshotIpc(): void {
  ipcMain.handle('screenshot:capture', async () => {
    const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]

    if (!targetWindow) {
      throw new Error('No application window is available to capture')
    }

    const image = await targetWindow.webContents.capturePage()
    const png = image.toPNG()

    const dir = getScreenshotsDir()
    const capturedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const fileName = `screenshot-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`
    const filePath = join(dir, fileName)

    writeFileSync(filePath, png)

    return { filePath, fileName, capturedAt }
  })

  ipcMain.handle('screenshot:list', () => {
    const dir = getScreenshotsDir()

    const files = readdirSync(dir).filter((fileName) => fileName.toLowerCase().endsWith('.png'))

    return files
      .map((fileName) => {
        const filePath = join(dir, fileName)
        const stats = statSync(filePath)

        return {
          fileName,
          filePath,
          capturedAt: dayjs(stats.mtime).format('YYYY-MM-DD HH:mm:ss')
        }
      })
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  })

  ipcMain.handle('screenshot:openFolder', () => {
    const dir = getScreenshotsDir()

    void shell.openPath(dir)

    return { success: true }
  })
}
