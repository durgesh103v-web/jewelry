import { app, dialog } from 'electron'
import dayjs from 'dayjs'
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { basename, dirname, join } from 'path'
import { closeDatabase, getDatabase, getDatabasePath } from '../database/connection'

function safeDelete(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path)
  }
}

export const backupService = {
  async createBackup() {
    const db = getDatabase()

    const result = await dialog.showOpenDialog({
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        cancelled: true,
        message: 'Backup cancelled.'
      }
    }

    const backupDir = result.filePaths[0]

    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }

    db.pragma('wal_checkpoint(FULL)')

    const backupFileName = `jewellery-erp-backup-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.db`
    const backupPath = join(backupDir, backupFileName)

    await db.backup(backupPath)

    return {
      success: true,
      cancelled: false,
      fileName: backupFileName,
      backupPath,
      message: `Backup created successfully: ${backupFileName}`
    }
  },

  async restoreBackup() {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup File',
      properties: ['openFile'],
      filters: [
        {
          name: 'SQLite Backup',
          extensions: ['db']
        }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        cancelled: true,
        message: 'Restore cancelled.'
      }
    }

    const selectedBackupPath = result.filePaths[0]
    const dbPath = getDatabasePath()
    const dbDir = dirname(dbPath)

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    closeDatabase()
    safeDelete(`${dbPath}-wal`)
    safeDelete(`${dbPath}-shm`)

    copyFileSync(selectedBackupPath, dbPath)

    getDatabase()

    app.relaunch()
    app.exit(0)

    return {
      success: true,
      cancelled: false,
      fileName: basename(selectedBackupPath),
      message: 'Backup restored successfully. App is restarting.'
    }
  }
}
