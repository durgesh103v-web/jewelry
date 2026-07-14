# Jewellery ERP — Security Review

Date: 2026-07-14. Threat model: a single-user offline desktop app installed on a shop's Windows PC. The main realistic threats are (a) someone with physical/console access to the machine, (b) a malicious or corrupted backup file, and (c) defence-in-depth against any future feature that renders remote/untrusted content. There is no server, no network listener, and no multi-tenant surface, so classic web risks (CSRF, SSRF, remote RCE) are largely out of scope.

Overall the app is in good shape on the fundamentals: context isolation is on, Node integration is off, a Content-Security-Policy is set, passwords are properly hashed, and every SQL statement is parameterised. The main gap is that the built-in user/login system is not actually enforced, plus a handful of standard Electron hardening switches.

---

## Done right (no action needed)

- **Renderer is locked down.** `contextIsolation: true`, `nodeIntegration: false`, and a preload `contextBridge`. The renderer cannot touch Node or the filesystem directly.
- **CSP present.** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:` — blocks remote and inline scripts, so a stored-data XSS can't pull in an external payload.
- **Passwords hashed correctly.** `user.service.ts` uses `scrypt` with a per-user 16-byte random salt and verifies with `timingSafeEqual` (constant-time). No plaintext, no fast/unsalted hash. Password hashes are never returned to the renderer (`mapRow` strips them).
- **No SQL injection.** Every query uses `?` bound parameters. The only string-interpolated SQL (`ALTER TABLE ${tableName} …` in `connection.ts`) uses hardcoded constants, never user input.
- **No `dangerouslySetInnerHTML` / `innerHTML`.** All data is rendered through React, which escapes by default — including the print previews.
- **External links handled safely.** `window.open` is denied and routed to the OS browser; the WhatsApp deep link is built with a fixed `https://wa.me/` scheme and `encodeURIComponent`, so a phone/message value can't inject another URL scheme.
- **Backups use native OS dialogs**, so there's no attacker-controlled path (no path traversal).

---

## Findings

### S1 — Login/authentication is not enforced · Medium (headline issue)
`user.service.ts` exports `verifyPassword`, and there's a full Users table with roles (ADMIN/USER) and a User Management screen — but `verifyPassword` **is never called anywhere**, and `user.ipc.ts` exposes only list/create/update/delete, no `authenticate`/`login`. The app boots straight into full access. Consequences:

- Anyone who can open the app sees and edits all financial data, customers, and can delete bills.
- The ADMIN/USER role field is decorative — no code checks it.

Fix: add a login gate at startup (an `auth:login` IPC that calls `verifyPassword`, a first-run "create admin" flow, and a session held in the main process). Until then the User Management screen gives a false sense of security.

### S2 — No IPC authorization / role checks · Medium (depends on S1)
Every `ipcMain.handle` runs its action with no caller identity or role check. Sensitive channels — `users:*`, `delete-sale-bills`, `backup/restore`, `financial-years:*` — are callable unconditionally. Once S1 exists, gate the destructive/admin channels behind the logged-in role in the main process (never trust the renderer to hide buttons).

### S3 — Electron hardening switches · Low–Medium (defence in depth)
In `main/index.ts`:

- **`sandbox: false`.** The preload runs with full Node. Since the preload only uses `electron` APIs (ipcRenderer/contextBridge), evaluate turning `sandbox: true` — it's the strongest renderer isolation and likely compatible here.
- **No navigation guard.** Add `contents.on('will-navigate', e => e.preventDefault())` (and block `will-redirect`) so nothing can steer the window to a remote origin, which would then run under the app's privileges.
- **No global new-window / webview lockdown.** Add an `app.on('web-contents-created')` handler that denies `setWindowOpenHandler` targets except an allowlist and rejects `will-attach-webview`.
- **`setWindowOpenHandler` opens any URL externally.** Validate the scheme (`https:`/`http:`/`mailto:` only) before `shell.openExternal`, so a crafted `file:`/custom-scheme URL can't be launched.
- **Leftover test handler.** `ipcMain.on('ping', …)` should be removed from production.

### S4 — Data at rest is unencrypted · Low–Medium (informational)
The SQLite DB (and every backup `.db`) is plaintext on disk and contains customer PII (names, phones, addresses, GST/PAN) and full financial history. Password hashes are safe (scrypt), but the business data is readable by anyone with file access or a stolen backup. Options, in order of effort: rely on OS full-disk encryption (BitLocker) and document it; store backups in a user-protected location; or move to an encrypted DB (SQLCipher / better-sqlite3-multiple-ciphers) if confidentiality matters.

### S5 — Broad `electron` bridge exposure · Low
`contextBridge.exposeInMainWorld('electron', electronAPI)` exposes the toolkit's generic `ipcRenderer` (any channel). The typed `api` object is the clean, whitelisted surface; the generic `electron.ipcRenderer` isn't needed by the app and widens what compromised content could reach. Consider dropping the generic `electron` export, or trimming it to only what's used.

### S6 — Restore accepts any `.db` without validation · Low
`restoreBackup` copies the chosen file over the live DB and relaunches, with no check that it's a well-formed, expected-schema SQLite file. A wrong/corrupt file bricks the app until manually fixed. Add a quick integrity check (open read-only, `PRAGMA integrity_check`, verify a known table exists) before overwriting, and keep a copy of the current DB as a safety net.

---

## Suggested priority
1. **S1 + S2** — real access control (login + role-gated admin/destructive channels). Biggest security value.
2. **S3** — Electron hardening (navigation guard, scheme allowlist, remove `ping`, evaluate `sandbox: true`). Small, safe edits.
3. **S6** — validate restore input.
4. **S4 / S5** — decide on encryption-at-rest posture and trim the bridge.

None of these are actively exploited remotely — the app has no network attack surface. S1/S2 are about protecting data on a shared shop PC; S3–S6 are hardening and resilience.
