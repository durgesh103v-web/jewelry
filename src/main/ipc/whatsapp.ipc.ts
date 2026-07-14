import { ipcMain, shell } from 'electron'

/**
 * Builds a wa.me deep link for the given phone number and message.
 *
 * Pure function so the country-code normalization can be reasoned about (and
 * unit tested) independently of Electron's shell.openExternal side effect.
 *
 * Rules:
 * - Strip everything except digits.
 * - A bare 10-digit number is assumed to be an Indian mobile number missing
 *   its country code, so it gets prefixed with "91".
 * - Anything else (already has a country code, or an unusual length) is
 *   passed through as-is - we don't want to mangle a number we can't be sure
 *   about.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digitsOnly = (phone || '').replace(/\D/g, '')
  const normalizedPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message || '')}`
}

export function registerWhatsAppIpc(): void {
  ipcMain.handle('whatsapp:send', async (_event, payload: { phone: string; message: string }) => {
    const phone = (payload?.phone || '').replace(/\D/g, '')

    if (!phone) {
      throw new Error('Please enter a valid phone number')
    }

    const url = buildWhatsAppUrl(payload.phone, payload.message || '')

    await shell.openExternal(url)

    return { success: true, url }
  })
}
