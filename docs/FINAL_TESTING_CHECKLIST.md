# Jewellery ERP Final Testing Checklist

## Test Date
- Date:

## Test Accounts
- Test Customer
- Test Supplier

## Test Item
- Gold Ring Test

---

## 1. Opening Stock Test

Input:
- Opening Qty: 10
- Opening Weight: 100 gram

Expected:
- Item Stock Qty: 10
- Item Stock Weight: 100 gram

Status:
- [ ] Pass
- [ ] Fail

---

## 2. Purchase Test

Input:
- Supplier: Test Supplier
- Qty: 5
- Weight: 50 gram
- Amount: 50000
- Payment: 10000

Expected Supplier Ledger:
- Jama: 50000
- Nave: 10000
- Balance: 40000 Jama

Expected Stock:
- Qty: 15
- Weight: 150 gram

Status:
- [ ] Pass
- [ ] Fail

---

## 3. Sale Test

Input:
- Customer: Test Customer
- Qty: 3
- Weight: 30 gram
- Amount: 36000
- Payment: 6000

Expected Customer Ledger:
- Nave: 36000
- Jama: 6000
- Balance: 30000 Nave

Expected Stock:
- Qty: 12
- Weight: 120 gram

Status:
- [ ] Pass
- [ ] Fail

---

## 4. Cash Receipt Test

Input:
- Account: Test Customer
- Receipt Amount: 10000

Expected Customer Ledger:
- Previous Balance: 30000 Nave
- Cash Receipt Jama: 10000
- Final Balance: 20000 Nave

Expected Cash Book:
- Receipt: 10000

Status:
- [ ] Pass
- [ ] Fail

---

## 5. Cash Payment Test

Input:
- Account: Test Supplier
- Payment Amount: 15000

Expected Supplier Ledger:
- Previous Balance: 40000 Jama
- Cash Payment Nave: 15000
- Final Balance: 25000 Jama

Expected Cash Book:
- Payment: 15000

Status:
- [ ] Pass
- [ ] Fail

---

## 6. Account Balance Report Test

Expected:
- Test Customer: 20000 Nave
- Test Supplier: 25000 Jama

Status:
- [ ] Pass
- [ ] Fail

---

## 7. Cash Book Report Test

Expected:
- Total Receipt: 10000
- Total Payment: 15000
- Closing Cash: -5000

Status:
- [ ] Pass
- [ ] Fail

---

## 8. Item Stock Report Test

Expected:
- Gold Ring Test Qty: 12
- Gold Ring Test Weight: 120 gram

Status:
- [ ] Pass
- [ ] Fail

---

## 9. Item Transaction Report Test

Expected:
- Opening: +10
- Purchase: +5
- Sale: -3
- Closing: 12

Status:
- [ ] Pass
- [ ] Fail

---

## Cross-Check Rules

Cash rules:
- Cash Receipt = Jama
- Cash Payment = Nave

Ledger balance rule:
- Balance = Opening + Nave - Jama

Stock rules:
- Opening Stock increases stock
- Purchase increases stock
- Sale decreases stock

Date filter rule:
- Same from date and to date must include entries from that date
- SQL should use date >= fromDate and date <= toDate

Opening balance rule:
- Opening balance is added once only
- Do not add opening balance again on every row

---

## Final Result

- [ ] All tests passed
- [ ] Issue found

Issue Notes:
-