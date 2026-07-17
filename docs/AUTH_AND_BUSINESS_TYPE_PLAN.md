# Register / Login + Wholesaler vs Retailer — Design & Plan

Date: 2026-07-14. Goal: add a proper first-run **Register** and a **Login** gate, keep it **single-user** (one login per installation, no multi-user management), and split the app into **Wholesaler** (all features) vs **Retailer** (reduced features), chosen at registration. Also trim dev/unused pieces so the build is production-ready.

Anything marked **(proposed)** is my default recommendation — tell me to change any line.

---

## 1. Concept (clearing the confusion)

- **Firm = your shop.** Always exactly one (`default-firm`). Holds shop name, GST, address, bill header. This never becomes "many firms."
- **User = the single login** for whoever runs this PC. One user, period. No add/delete-user screen.
- **Business Type = Wholesaler or Retailer.** Chosen once at registration. Controls which menus/features are visible. This is the "less features for retailer" behaviour.

So it's not "one user per firm" — it's **one firm, one user, one business type**, all fixed per installation.

---

## 2. Flow

**First launch (no user in DB):** show **Register** screen (full-window, before the app loads):
- Username
- Password + Confirm password
- Shop / Firm name (seeds Firm Master)
- **Business Type: Wholesaler / Retailer** (radio)
- "Create Account" → saves the single user (scrypt-hashed password, role ADMIN) + business_type + firm name → auto-login → open app.

**Every later launch:** show **Login** screen:
- Username + Password → verified in main process (`verifyPassword`) → open app.
- Wrong credentials → error, no entry. (Optional: lock for a few seconds after N failed tries.)

**Inside the app:**
- Top bar shows the logged-in username + a **Logout** button (returns to Login).
- **Change Password** screen (replaces "User Management") — verify current password, set new one.
- Business type is shown in Settings; **(proposed)** changeable there with a confirm dialog.

**Session:** held in the main process (module variable + the DB is the source of truth). Renderer asks `auth:status` on startup to decide Register vs Login vs App.

---

## 3. Wholesaler vs Retailer — feature matrix (proposed)

Legend: **Both** = visible to everyone · **WS** = Wholesaler only · **RT** = Retailer only.

### Master
| Item | Visibility |
|---|---|
| Account Master, Account Group | Both |
| Item Master, Item Group, Item Stamp, Item Design | Both |
| Item Opening Stock | Both |
| Firm Master | Both |
| Cash Fine Opening | **WS** (metal fine opening is a wholesale concept) |

### Transaction
| Item | Visibility |
|---|---|
| Sale (fine/tunch/wastage wholesale sale) | **WS** |
| Sale Return | **WS** |
| Purchase (fine-based) | **WS** |
| Purchase Return | **WS** |
| Approval | **WS** |
| Sauda Book | **WS** |
| Settlement | **WS** |
| Transfer | **WS** |
| Job Work | **WS** |
| Repair Entry | Both |
| Cash Payment / Nave, Cash Receipt / Jama | Both |
| Weight Scan | Both |
| Order Payal (custom orders) | Both |

### GST / Estimate
| Item | Visibility |
|---|---|
| Retail Sale GST | Both (retailer's **main** sale screen) |
| Retail Sale Estimate | Both |
| GST Purchase | Both (retailer buys stock here) |
| GST Sale Register | Both |
| Estimate Register | Both |

### Reports
| Item | Visibility |
|---|---|
| Cash Book, Bank Transactions, Daily Summary | Both |
| Account Balance, Outstanding, Party Statement | Both |
| Sale Register, Purchase Register | Both |
| Accountwise Details, Payment / Receipt | Both |
| Item Stock, Item Transaction, Stock Ledger | Both |
| Itemwise Sale Purchase | Both |
| Fine Rojmel, Dar Rojmel | **WS** |
| Accountwise Summary, Account Wise Sale Purchase | **WS** |
| Item Sale Purchase City Wise, Fine Margin | **WS** |
| Delete Sale Bills | Both |

### Utility
| Item | Visibility |
|---|---|
| Backup, Restore Backup | Both |
| Barcode Printing, Reminder, Printer Setting | Both |
| Financial Year, Settings | Both |
| Change Password (was User Management) | Both |
| Screen Shot | Both — **removal candidate** |
| WhatsApp | Both — **removal candidate** |

**Net effect for Retailer:** loses the whole wholesale fine-exchange side (fine Sale/Purchase/Returns, Approval, Sauda, Settlement, Transfer, Job Work, Cash Fine Opening, and the fine/rojmel reports) and works mainly through **GST retail billing + estimate + repair + orders + stock + GST/daily reports**. That's the "less features" split.

This matrix is the main thing to confirm/adjust.

---

## 4. Cleanup for production (proposed)

- Remove the leftover `ipcMain.on('ping', …)` test handler.
- Replace **User Management** (multi-user) with **Change Password** (single user).
- Apply the S3 security hardening from the security review at the same time (navigation guard, external-URL scheme allowlist).
- **Screen Shot** and **WhatsApp** modules: keep or remove — your call (listed above as candidates).
- Weight Scan / Sauda / Order Payal: kept in the matrix above; say the word if any aren't part of your real workflow and I'll drop them too.

---

## 5. Build phases

1. **Data + main process:** `business_type` setting; `auth:status / register / login / logout / change-password` IPC; enforce "single user"; keep session in main.
2. **Register + Login UI:** full-window gate before `App`; wire to auth IPC; auto-seed firm name + business type on register.
3. **Feature gating:** tag each menu item with `Both/WS/RT`; filter `appMenus` by the stored business type; guard the corresponding IPC in main so a hidden feature can't be reached.
4. **Change Password screen** replacing User Management; top-bar username + Logout.
5. **Cleanup + hardening:** remove `ping`, remove/keep Screenshot & WhatsApp per your answer, add navigation/scheme guards.
6. **Verify:** local `npm run typecheck` + manual click-through of Register → Login → both business types.

---

## Decisions I need from you
1. **Feature matrix above** — good as-is, or move any items between Both / WS / RT?
2. **Business type changeable later in Settings?** (proposed: yes, with confirm) or locked at registration?
3. **Screen Shot and WhatsApp** — keep both, remove both, or keep one?
4. Any **Weight Scan / Sauda / Order Payal** you want removed entirely?

Once you confirm these, I'll build phases 1–6.
