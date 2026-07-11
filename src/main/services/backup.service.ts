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

function setAppSetting(key: string, value: string): void {
  const db = getDatabase()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  db.prepare(
    `
    INSERT INTO app_settings (
      key,
      value,
      updated_at
    )
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `
  ).run(key, value, now)
}

function getAppSetting(key: string): string {
  const db = getDatabase()

  const row = db
    .prepare(
      `
      SELECT value
      FROM app_settings
      WHERE key = ?
    `
    )
    .get(key) as { value: string } | undefined

  return row?.value || ''
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

    const backupAt = dayjs().format('YYYY-MM-DD HH:mm:ss')

    setAppSetting('last_backup_at', backupAt)
    setAppSetting('last_backup_file_name', backupFileName)
    setAppSetting('last_backup_path', backupPath)

    return {
      success: true,
      cancelled: false,
      fileName: backupFileName,
      backupPath,
      backupAt,
      message: `Backup created successfully: ${backupFileName}`
    }
  },

  getLastBackup() {
    return {
      backupAt: getAppSetting('last_backup_at'),
      fileName: getAppSetting('last_backup_file_name'),
      backupPath: getAppSetting('last_backup_path')
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
