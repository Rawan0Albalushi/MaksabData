# Maksab PRO - Project TODO

## Phase 1: Database Schema & Models
- [x] Users table with roles, permissions, wilayat, status, profile fields
- [x] Employees table linked to users with manager relationship
- [x] Mandoubs table with type, responsible employee, approval status
- [x] Stores table with all optional fields, classification, activation status
- [x] Wilayats table for area management
- [x] Menu categories table linked to stores
- [x] Products table with add-ons/options
- [x] Approval requests table with snapshots and status
- [x] Notifications table with read/unread state
- [x] Audit log table with old/new values
- [x] Store follow-up history table
- [x] Store images/files table
- [x] Roles and permissions tables

## Phase 2: Authentication & Roles
- [x] Login system with session management
- [x] Role-based access control (7 roles)
- [x] Permission flags system (ViewAllAreas, ManageUsers, etc.)
- [x] Super admin roles (المدير, نائب المدير, الوزير الأعلى) get full access
- [x] Wilayat-based access filtering
- [x] Protected routes and procedures

## Phase 3: Bilingual Layout (Arabic/English)
- [x] RTL layout for Arabic, LTR for English
- [x] Language switcher in top bar
- [x] All labels/statuses in both languages
- [x] Direction changes based on selected language
- [x] i18n translation system

## Phase 4: Dashboards
- [x] Manager dashboard with real stats
- [x] Deputy Manager dashboard
- [x] Top Employee Minister dashboard
- [x] State Employee Minister dashboard (wilayat-filtered)
- [x] Finance Manager dashboard (Phase 2 placeholder)
- [x] Employee dashboard
- [x] Mandoub simple dashboard/portal

## Phase 5: Employee Management
- [x] List employees with filters and pagination
- [x] Add employee form
- [x] Edit employee
- [x] View employee profile
- [x] Archive/deactivate employee
- [x] Assign to wilayat and manager

## Phase 6: Mandoub Management
- [x] List mandoubs with filters
- [x] Add mandoub (creates pending approval)
- [x] Edit mandoub
- [x] Mandoub approval workflow
- [x] Mandoub activation/deactivation
- [x] Mandoub portal (own data only)
- [x] Types: مندوب سريع, مندوب المسافات الطويلة

## Phase 7: Store Management
- [x] Store list with advanced filters
- [x] Add store (only name required)
- [x] Edit store
- [x] Store details page with all sections
- [x] Store activation approval workflow
- [x] Contracted store details section
- [x] Ezhalha store details section
- [x] Archive/deactivate store

## Phase 8: Menu & Products (inside store details)
- [x] Menu categories CRUD
- [x] Products CRUD with add-ons/options
- [x] Product status and sort order
- [x] Product images (URL field in create/edit form, displayed in product table)

## Phase 9: Notifications
- [x] Internal notification system
- [x] Notifications for approval requests
- [x] Notifications for activation events
- [x] Read/unread state per user
- [x] Notification bell in top bar

## Phase 10: Audit Log
- [x] Log all important actions
- [x] Field-level old/new values
- [x] Filter by entity type, user, date
- [x] View audit log page
- [x] Detail view dialog showing old/new values
- [x] Login event audit logging
- [x] Approval review actions (approve/reject) with notes
- [x] Notifications for mandoub approval/rejection
- [x] Notifications for store activation events

## General
- [x] Zero TypeScript errors
- [x] All 11 tests passing
- [x] No mock or static data - all real database reads/writes
- [x] Professional operations management UI theme
- [x] Clean, stable, extensible codebase

## Phase 1 Hardening Fixes

### Critical: First Admin / Owner User
- [x] Auto-assign project owner as المدير (Manager) with full permissions on first login
- [x] Ensure maksabRole = manager for owner, not just role = admin

### 1. Fix Authentication and User Account Structure
- [x] Ensure internal user profile has: full name, phone, wilayat, email, profile photo, maksabRole, jobTitle, status, permissions
- [x] Link OAuth identity to proper internal user profile

### 2. Prevent Users from Changing Own Role/Job Title
- [x] Strip sensitive fields (maksabRole, role, jobTitle, permissions, status) from self-profile updates
- [x] Only المدير/نائب المدير/الوزير الأعلى can change roles and permissions

### 3. Implement Real Profile Edit Approval
- [x] Profile edits create approval request with old/new data snapshots
- [x] Approved profile edits apply changes to user record
- [x] Rejected profile edits keep old data

### 4. Fix Approval Requests to Apply Real Actions
- [x] Approval approve action executes the real change (store activation, mandoub activation, profile edit)
- [x] Each approval linked to targetEntityType and targetEntityId
- [x] Rejection stores notes without applying changes

### 5. Fix Mandoub Approval Logic
- [x] Mandoub creation creates approval request with targetEntityType=mandoub, targetEntityId=mandoub.id
- [x] Approving mandoub sets status=active, stores approvedBy
- [x] Rejecting mandoub sets status=rejected with notes

### 6. Link Mandoub to User Account
- [x] Add mandoubs.userId column referencing users.id
- [x] Mandoub portal loads by userId, not phone/email
- [x] Mandoub creation supports linking to user account

### 7. Link Employee to User Account
- [x] Add/verify employees.userId column referencing users.id
- [x] Employee profile connected to login user

### 8. Add Real Database Relationships
- [x] Add foreign key references in Drizzle schema for all key relationships
- [x] Run migration for new columns and constraints
- [x] store_categories table created with seed data
- [x] mandoubs.approvedBy column added
- [x] mandoubs.status includes 'rejected'
- [x] store_images has caption and archived fields
- [x] stores.category changed to varchar (references store_categories)
- [x] users.fullNameWithTribe field added

### 9. Fix Wilayat-Based Access Security
- [x] Backend enforces wilayat filtering: restricted users forced to own wilayat
- [x] Cannot bypass by passing wilayatId in API input
- [x] Apply to employees, mandoubs, stores, dashboard counts

### 10. Fix Frontend Navigation Based on Permissions
- [x] Sidebar hides pages user cannot access based on permissions
- [x] Backend authorization remains active regardless

### 11. Complete Store List Columns
- [x] Store list shows: name, merchant name, merchant phone, category, communication status, merchant approval, added in system, activation, classification, wilayat, responsible employee, status, actions
- [x] Add all required filters

### 12. Complete Store Images and Files Management
- [x] Store images/files section with URL-based management
- [x] Each image has: storeId, fileType, fileUrl, caption, sortOrder, archived flag

### 13. Make Settings Real
- [x] Roles and permissions editable by full-access users
- [x] Store categories CRUD (add/edit/deactivate)
- [x] Wilayats CRUD
- [x] Mandoub types visible

### 14. Improve Dashboards Per Role
- [x] Role-specific dashboard content for all 7 roles
- [x] Employee dashboard: assigned stores, mandoubs under them
- [x] Finance manager: basic dashboard without fake financial data

### 15. Improve Audit Log
- [x] Log role changes, permission changes, profile edit requests/approvals
- [x] View audit logs filtered by specific entity (store, mandoub, user)

### 16. Protect Sensitive Config
- [x] Verify no database credentials in committed files
- [x] Secrets only in environment variables

### 17. Verify Store Creation Rule
- [x] Store created with only store name, all other fields optional
- [x] Activation requires permission or approval

### 18. Verify Super Admin Full Access
- [x] المدير, نائب المدير, الوزير الأعلى have full access to all modules
- [x] Both frontend and backend enforce this

### 19. Do Not Start Phase 2
- [x] No orders, bookings, finance, reports, coupons, complaints modules

### 20. Testing Checklist
- [x] All 23 checklist items verified and passing

### Additional Fixes
- [x] Admin user without maksabRole treated as manager (owner fallback) in Dashboard and Layout
- [x] All 11 tests passing
- [x] Zero TypeScript errors
- [x] Credential audit passed - no hardcoded secrets

## ============================================
## PHASE 2 - Maksab PRO Operations Platform
## ============================================

### P2-0: Bulk Store Import from Excel/CSV
- [x] File upload endpoint (xlsx, xls, csv)
- [x] Column matching (English + Arabic column names)
- [x] Preview table: total, valid, invalid, duplicate rows
- [x] Duplicate detection (same name + wilayat)
- [x] Import with skip/import/update duplicate options
- [x] Import result page with success/skip/error counts
- [x] Audit log for import batch + per store
- [x] Permissions: ManageStores or super admin
- [x] Do NOT break existing manual store creation

### P2-1: Orders Module
- [x] Orders database table with all fields
- [x] Order types: restaurant, cafe, shop, ezhalha, contracted, long-distance, customer-to-customer, booking, other
- [x] Order statuses: 22 statuses from new to archived
- [x] Payment methods and payment statuses
- [x] Orders list page with search and filters
- [x] Add manual order form
- [x] Edit order
- [x] Order details page with status timeline
- [x] Assign mandoub to order
- [x] Change order status with audit logging
- [x] Archive order
- [x] Internal notes on orders

### P2-2: Ezhalha Order Workflow
- [x] Ezhalha-specific fields on order (store contact, availability, price diff, etc.)
- [x] Ezhalha financial tracking (customer paid, Maksab paid, delivery fee, profit/loss)

### P2-3: Contracted Store Order Workflow
- [x] Contracted order fields (commission, store sales, dues)
- [x] Link to store dues and financial reports

### P2-4: Long-Distance Delivery Orders
- [x] Pickup/delivery wilayat and address
- [x] Sender/receiver info
- [x] Long-distance mandoub assignment

### P2-5: Customers Module
- [x] Customers database table
- [x] Customer list with filters
- [x] Add/edit/view customer
- [x] Customer details: orders, bookings, complaints, notes
- [x] Archive customer

### P2-6: Bookings Module
- [x] Bookings database table
- [x] Booking types: turf, grass field, wedding hall, other
- [x] Booking statuses
- [x] Bookings list with filters
- [x] Add/edit/view booking
- [x] Link booking to customer
- [x] Archive booking

### P2-7: Cancellations/Refunds
- [x] Refunds database table
- [x] Refund types: full, partial, none
- [x] Who caused issue / who covers difference
- [x] Refund approval workflow
- [x] Link to order/booking
- [x] Affect financial reports

### P2-8: Coupons & Offers
- [x] Coupons database table
- [x] Discount types: fixed, percentage, free delivery
- [x] Who bears discount: Maksab, store, shared
- [x] Usage tracking
- [x] Offers database table
- [x] Link coupons to orders

### P2-9: Finance - Budgets
- [x] Budgets database table
- [x] Budget by feature/service and wilayat
- [x] Spent/remaining auto-calculation
- [x] Budget list with filters
- [x] Add/edit/view budget

### P2-10: Finance - Expenses
- [x] Expenses database table
- [x] Expense types and approval workflow
- [x] Link to budget (affects spent/remaining)
- [x] Expense list with filters
- [x] Add/edit/view expense

### P2-11: Finance - Revenues
- [x] Revenues database table
- [x] Revenue sources: order, booking, delivery fee, commission, other
- [x] Link to order/booking/store
- [x] Revenue list with filters

### P2-12: Finance - Profits
- [x] Profit calculation from orders and bookings
- [x] Profit summaries by order, store, wilayat, feature, date range

### P2-13: Mandoub Dues
- [x] Mandoub dues database table
- [x] Earning types: per order, daily, weekly, monthly, bonus, adjustment
- [x] Payment tracking
- [x] Mandoub dues list with filters

### P2-14: Store Dues
- [x] Store dues database table
- [x] Commission tracking for contracted stores
- [x] Settlement status
- [x] Store dues list with filters

### P2-15: Settlements
- [x] Settlements database table
- [x] Settlement types: mandoub, store, internal, refund, ezhalha, other
- [x] Approval workflow
- [x] Settlements list with filters

### P2-16: Complaints & Support
- [x] Complaints database table
- [x] Complaint types and statuses
- [x] Link to order/booking/customer/store/mandoub
- [x] Complaints list with filters
- [x] Add/edit/view complaint
- [x] Assign employee

### P2-17: Operational Reports
- [x] Reports page with report type selection
- [x] Stores, Orders, Employees, Mandoubs, Ezhalha, Bookings, Complaints, Approvals reports
- [x] Date range, wilayat, employee, status filters
- [x] Summary cards + detailed table
- [x] Export CSV

### P2-18: Financial Reports
- [x] Budgets, Expenses, Revenues, Profits, Mandoub Dues, Store Dues, Settlements, Coupons, Refunds reports
- [x] Date range and wilayat filters
- [x] Summary cards + detailed table
- [x] Export CSV

### P2-19: Dashboard Updates
- [x] Manager dashboard: orders today, pending, completed, cancelled, ezhalha, bookings, complaints, revenue, expenses, profit
- [x] State Employee Minister: wilayat-specific data
- [x] Employee: assigned orders, stores, mandoubs, complaints
- [x] Mandoub: orders, earnings, paid/remaining
- [x] Finance Manager: budgets, expenses, revenues, profits, dues, settlements

### P2-20: Navigation Structure
- [x] Add Orders section with sub-items
- [x] Add Bookings section
- [x] Add Customers section
- [x] Add Finance section with sub-items
- [x] Add Reports section with sub-items
- [x] Add Complaints section
- [x] Keep all Phase 1 navigation

### P2-21: Advanced Notifications
- [x] Notifications for orders, bookings, refunds, expenses, complaints, budgets, settlements, imports

### P2-22: Audit Logging for Phase 2
- [x] Audit log entries for all Phase 2 CRUD operations

### P2-23: Permissions Update
- [x] New permissions: ManageOrders, ManageBookings, ManageCustomers, ManageFinance, ManageReports, ManageComplaints, ManageCoupons
- [x] Super admins get full access to all Phase 2 modules

## Bug Fixes
- [x] Fix: /stores page returns "Insufficient permissions" for owner with maksabRole=null — backend must treat admin/owner as manager

## ============================================
## PHASE 2 STABILIZATION
## ============================================

### S-1: Stabilize Phase 2 Enum/Field Mismatches
- [x] Audit all Phase 2 modules for frontend/backend/database field name mismatches
- [x] Standardize enum values across forms, backend validation, and database schema
- [x] Ensure all forms send correct field names and enum values
- [x] Ensure all forms save successfully to database
- [x] Ensure all forms load real data from database
- [x] Verify permissions and wilayat-based access in all modules

### S-2: Real Role, Job Title, and Permission Management
- [x] Roles Management page: view, add, edit, activate/deactivate roles
- [x] Job Titles/Positions Management: add, edit, activate/deactivate
- [x] Permissions Management: assign/remove permissions to/from roles
- [x] User Role Assignment: change user role, job title from UI (implemented in Settings > Users tab)
- [x] Database tables for roles, job_titles, role_permissions
- [x] Backend routers for roles, job_titles, permissions CRUD
- [x] Protect full-access roles (manager, deputy_manager, top_employee_minister) from lockout
- [x] Backend enforces permissions; frontend navigation respects permissions
- [x] Audit log for role/permission/job title changes

### S-3: Store Onboarding Fields
- [x] Add missing store fields to database: communicationStatus, merchantApproval, addedInSystem, activationStatus, classification, notes (already existed, enum values fixed)
- [x] Define approved enum values for each field in schema
- [x] Update store create/update backend validation
- [x] Update Add Store form with all onboarding fields (only storeName required)
- [x] Update Edit Store form with all onboarding fields
- [x] Update Store List table columns to show all onboarding fields
- [x] Update Store Filters for all onboarding fields
- [x] Update Store Details page to show/edit onboarding fields
- [x] Update Excel/CSV bulk import to support new columns (Arabic + English)
- [x] Ensure imported stores respect activation approval rules
- [x] Add bilingual translations for all new fields, labels, enum values
- [x] Audit log for store onboarding field changes

### S-4: Testing Checklist
- [x] Manager can open Roles Management
- [x] Manager can add/edit/activate/deactivate a role
- [x] Manager can assign permissions to a role
- [x] Manager can create/edit job titles
- [x] Manager can change user role and job title (via Settings > Users tab edit dialog)
- [x] Full-access roles still have full access
- [x] Normal users cannot edit own role/job title/permissions
- [x] Add Store form shows all onboarding fields
- [x] Store can be created with Store Name only
- [x] Store table shows all onboarding columns
- [x] Store filters work for all onboarding fields
- [x] Store details page shows and edits onboarding fields
- [x] Excel/CSV import supports new columns
- [x] Imported stores appear in Store Management table
- [x] Activation approval rules not bypassed
- [x] Audit log records role/permission/store changes
- [x] Arabic/English and RTL/LTR still work
- [x] Zero TypeScript errors
- [x] All tests passing (45/45)

## ========================== Priority 1: Data Import ==========================

### DI-1: Database Schema & Infrastructure
- [x] Create import_batches table (id, importType, fileName, uploadedBy, uploadDate, totalRows, importedRows, skippedRows, duplicateRows, status, errorSummary, notes)
- [x] Create products table (already existed, verified schema)
- [x] Create payments table (id, paymentReference, orderId, bookingId, customerId, amount, paymentMethod, paymentStatus, paymentDate, isRefunded, refundAmount, notes, importBatchId, timestamps)
- [x] Add importBatchId field to stores, products, customers, orders tables (tracked via import_batches table)
- [x] Run migrations for all new tables

### DI-2: Excel/CSV Parsing Library & Utilities
- [x] Install xlsx library for real .xlsx parsing (NOT readAsText)
- [x] Create shared normalization utilities for all enum fields
- [x] Create shared validation utilities (required fields, duplicate detection)
- [x] Support .xlsx and .csv file types, show clear error for .xls

### DI-3: Backend Import Routers
- [x] Stores import router (parse, preview, confirm)
- [x] Menu & Products import router (parse, preview, confirm with store matching)
- [x] Customers import router (parse, preview, confirm with phone duplicate check)
- [x] Orders import router (parse, preview, confirm with order number duplicate check)
- [x] Payments import router (parse, preview, confirm with order/booking linking)
- [x] Import History router (list batches, get batch details)
- [x] Enforce permissions (ImportStores, ImportProducts, ImportCustomers, ImportOrders, ImportPayments, ViewImportHistory)
- [x] Enforce wilayat access restrictions on all imports

### DI-4: Frontend Data Import Section
- [x] Add Data Import main navigation item (استيراد البيانات)
- [x] Create DataImport page with sub-navigation for all 5 import types + history
- [x] Stores Import UI (upload, preview table, confirm, result)
- [x] Menu & Products Import UI (upload, preview table, confirm, result)
- [x] Customers Import UI (upload, preview table, confirm, result)
- [x] Orders Import UI (upload, preview table, confirm, result)
- [x] Payments Import UI (upload, preview table, confirm, result)
- [x] Import History page (list all batches with filters)
- [x] Duplicate handling options (skip/import anyway/update existing)

### DI-5: Permissions & Translations
- [x] Add ImportData, ImportStores, ImportProducts, ImportCustomers, ImportOrders, ImportPayments, ViewImportHistory permissions
- [x] Add bilingual translations for all import labels, statuses, error messages
- [x] Full access roles always have import access

### DI-6: Testing Checklist
- [x] CSV parsing works
- [x] XLSX parsing works with real Excel parser
- [x] Stores import creates records in stores table
- [x] Products import links to correct store
- [x] Customers import detects duplicate phone
- [x] Orders import validates order type and status enums
- [x] Payments import links to order/booking
- [x] Import preview shows before saving
- [x] Import batch history is saved
- [x] Audit logs are recorded
- [x] Permissions enforced on backend
- [x] Wilayat restrictions enforced
- [x] Zero TypeScript errors
- [x] All tests passing (52/52)

## ========================== CRITICAL FIXES (Priority 1) ==========================

### CF-1: Import must import ALL valid rows, not only preview rows
- [x] Store all valid rows server-side during parse, not just preview
- [x] Confirm Import imports ALL valid rows from the batch
- [x] Preview shows only first 20 rows for display
- [x] Import result shows correct total imported count

### CF-2: Do not parse XLSX as text
- [x] Verify xlsx library is used for .xlsx parsing (arrayBuffer)
- [x] CSV parsed as text is fine
- [x] .xls shows clear unsupported message

### CF-3: Remove or disable old Bulk Import
- [x] Remove old Bulk Import from navigation
- [x] Redirect /bulk-import to /data-import or show replacement message
- [x] Deleted BulkImport.tsx file

### CF-4: Fix manual Orders module orderType enums
- [x] Use only: restaurant, cafe, shop, ezhalha, contracted, long_distance, customer_to_customer, booking, other
- [x] Remove: delivery, pickup, special_task
- [x] Update Add/Edit Order forms, table, filters, details, backend validation

### CF-5: Fix order status values
- [x] Use approved 22 orderStatus values everywhere
- [x] Remove: pending, confirmed, ready, picked_up, returned
- [x] Update forms, badges, filters, backend

### CF-6: Fix payment status values
- [x] Remove paymentStatus = "pending" everywhere
- [x] Use: paid, not_paid, partially_paid, refunded, partially_refunded, failed, needs_review
- [x] Default for new unpaid order = not_paid

### CF-7: Fix mandoub dues field name
- [x] Backend maps dueType → earningType before DB insert
- [x] earningType values: per_order, daily, weekly, monthly, bonus, adjustment
- [x] Dues paymentStatus: unpaid, paid, partial, under_review (fixed from 'pending')

### CF-8: Align import enums with database
- [x] Orders Import uses approved orderType/orderStatus/paymentStatus values
- [x] Store Import uses approved classification/communicationStatus/merchantApproval/addedInSystem/activationStatus
- [x] Customer Import uses approved status values
- [x] Product Import uses approved productStatus values
- [x] Added not_specified to all store enum maps
- [x] Separate PAYMENT_TABLE_METHOD_MAP for payments table (in_app_payment)

### CF-9: Import permissions and wilayat access
- [x] Backend enforces ImportData/ImportStores/ImportProducts/ImportCustomers/ImportOrders/ImportPayments
- [x] Wilayat-restricted users cannot import other wilayat rows
- [x] Full access roles can import all

### CF-10: Import history stores correct counts
- [x] totalRows = total rows in file
- [x] importedRows = all valid rows imported (not just preview count)
- [x] skippedRows, duplicateRows correct
- [x] Batch statuses: pending_preview, imported, imported_with_errors, failed, cancelled

### CF-11: Do not break manual entry forms
- [x] Manual Add Store still works (enum values aligned)
- [x] Manual Add Order still works with new enums
- [x] Manual Add Mandoub Due still works (backend maps dueType → earningType)

### CF-12: Audit log for import and fixed modules
- [x] Import batch created/confirmed/cancelled logged
- [x] Order created/updated/status changed logged
- [x] Mandoub due created/updated logged

### CF-13: Remove sensitive .manus/db files
- [x] Removed scripts/ directory (contained DATABASE_URL references)
- [x] No .env files in project
- [x] No hardcoded credentials in code

## ========================== REMAINING CRITICAL FIXES (v2) ==========================

### RCF-1: Remove paymentStatus="pending" from orders
- [x] Fixed paymentStatus: "pending" → "not_paid" in order creation (phase2a.ts)

### RCF-2: Remove bookingStatus="pending"
- [x] Fixed bookingStatus: "pending" → "new" in booking creation (phase2a.ts)
- [x] Fixed needs_followup → needs_follow_up in schema + Bookings.tsx + migration applied

### RCF-3: Rename dueType→earningType everywhere
- [x] Frontend form fields use earningType (Dues.tsx)
- [x] Backend router inputs use earningType (phase2c.ts)
- [x] No dueType references remain in codebase (verified with grep)

### RCF-4: Remove old bulkImportRouter from backend
- [x] Disabled bulkImportRouter (throws FORBIDDEN error, directs to Data Import)

### RCF-5: Add .manus/ to .gitignore
- [x] Added .manus/ and scripts/ to .gitignore

### RCF-6: Verify Data Import imports all valid rows
- [x] Confirmed: parse stores all valid rows in validRowsData JSON column, confirm reads from batch

### RCF-7: Verify XLSX uses real Excel parsing
- [x] Confirmed: Frontend uses `import * as XLSX from 'xlsx'` with `file.arrayBuffer()` + `XLSX.read()`

### RCF-8: Wilayat access check in touched modules
- [x] Data Import enforces wilayat scope via getWilayatScope() + findWilayatByName()

### RCF-9: Search and remove all old invalid enum values
- [x] 'delivery' only in budget features (valid for budgets, not orderType)
- [x] 'confirmed' only in store ezhalha fields (valid) and settlements (valid)
- [x] Fixed Reports.tsx to use valid order statuses instead of pending/confirmed
- [x] needs_followup → needs_follow_up fixed in schema + frontend + migration applied

## ========================== PRIORITY 2 DATA IMPORT ==========================

### P2-1: Mandoubs Import
- [x] Backend parse/confirm router for mandoubs
- [x] Column map: Arabic + English headers
- [x] Normalize mandoubType (fast, long_distance)
- [x] Normalize status (active, pending_approval, inactive, suspended, archived)
- [x] Duplicate check by phone
- [x] Approval rule: imported mandoubs NOT active unless user has ApproveMandoub + file says active
- [x] Wilayat enforcement

### P2-2: Mandoub Performance Import
- [x] Create mandoub_performance table in schema
- [x] Backend parse/confirm router for mandoub performance
- [x] Column map: Arabic + English headers
- [x] Link to mandoub by phone/name
- [x] Link to order by orderNumber if found
- [x] Normalize delayed (yes/no → boolean)
- [x] Duplicate check: same mandoub + same order number

### P2-3: Mandoub Earnings/Dues Import
- [x] Backend parse/confirm router for mandoub dues
- [x] Column map: Arabic + English headers
- [x] Use earningType (NOT dueType)
- [x] Normalize earningType (per_order, daily, weekly, monthly, bonus, adjustment)
- [x] Normalize paymentStatus (unpaid, paid, partial, under_review)
- [x] Calculate remainingAmount if missing
- [x] Link to mandoub by phone
- [x] Duplicate check: same mandoub + same order + same earningType

### P2-4: Cancellations & Refunds Import
- [x] Backend parse/confirm router for cancellations/refunds
- [x] Column map: Arabic + English headers
- [x] Normalize refundType (full, partial, none)
- [x] Normalize causedBy (customer, store, mandoub, maksab, other)
- [x] Normalize coveredBy (maksab, customer, store, mandoub, not_specified)
- [x] Normalize refund status (pending_review, approved, rejected, completed, cancelled)
- [x] Link to order/booking
- [x] Duplicate check: same order/booking + same amount + same reason

### P2-5: Revenues Import
- [x] Backend parse/confirm router for revenues
- [x] Column map: Arabic + English headers
- [x] Normalize source (order, booking, delivery_fee, store_commission, other)
- [x] Normalize status (recorded, cancelled, adjusted, archived)
- [x] Normalize paymentMethod (in_app_payment, cash, bank_transfer, card, other)
- [x] Link to order/booking/store if found
- [x] Duplicate check: same source + same linked entity + same amount + same date

### P2-General
- [x] Add permissions: ImportMandoubs, ImportMandoubPerformance, ImportMandoubDues, ImportRefunds, ImportRevenues
- [x] Update frontend DataImport.tsx with 5 new import types
- [x] Update Import History to include P2 importType values
- [x] Add bilingual translations for all P2 labels
- [x] Zero TypeScript errors
- [x] All tests passing (52/52)
- [x] Existing Priority 1 imports still work

## ========================== REPORTS EXPORT FIX ==========================

- [x] Fix exportCSV: safe String(value ?? "") before .replace() — no runtime errors on numbers/null
- [x] Fix store export fields: nameAr, merchantName, merchantPhone, category, classification, activationStatus, communicationStatus, merchantApproval, addedInSystem, notes
- [x] Fix orders export fields: orderNumber, orderType, customerName, customerPhone, orderAmount, deliveryFee, totalPaidByCustomer, orderStatus, paymentStatus
- [x] Fix employees export fields: use valid employee schema fields only
- [x] Fix mandoubs export fields: fullName, phone, mandoubType, status, wilayatId
- [x] Fix bookings export fields: bookingNumber, serviceType, customerName, customerPhone, totalAmount, bookingStatus, paymentStatus
- [x] Fix complaints export fields: use valid complaint schema fields
- [x] Fix revenues export fields: source, amount, paymentMethod, status, notes, revenueDate
- [x] Fix expenses export fields: expenseType, amount, approvalStatus, reason, notes, expenseDate
- [x] Fix budgets export fields: name, feature, approvedAmount, spentAmount, remainingAmount, status
- [x] Add UTF-8 BOM (\uFEFF) for Arabic CSV export
- [x] Add Print report functionality
- [x] Add Excel .xlsx export using xlsx library
- [x] Add error handling with toast on export failure
- [x] Export respects current report type and filters (wilayat, dateFrom, dateTo)
- [x] Empty values show as empty cells or "-", not "undefined"

## ========================== REPORTS EXPORT V2 - COMPREHENSIVE FIX ==========================

- [x] Apply wilayat/date filters to ALL report queries (stores, orders, employees, mandoubs, bookings, complaints, revenues, expenses, budgets, mandoubDues, storeDues, settlements, refunds, coupons)
- [x] Add missing financial report types: Profits, Mandoub Dues, Store Dues, Settlements, Refunds, Coupons/Offers, Ezhalha Financial
- [x] Add missing operational report types: Approvals, Comprehensive Management
- [x] All export field names match actual database schema exactly
- [x] Safe cell conversion for all data types (null, undefined, numbers, booleans, dates, objects, arrays)
- [x] UTF-8 BOM for Arabic CSV export preserved
- [x] Real .xlsx Excel export with proper sheet name, header row, filename with report type and date
- [x] Professional print layout: logo/title, report type, date range, wilayat, generated date, summary cards, table, hide sidebar/buttons
- [x] Backend permissions enforced (ViewFinance for financial, ManageReports/ViewOrders etc for operational)
- [x] Wilayat access enforced on all report queries via enforceWilayatScope
- [x] Export all rows matching filters (not just first page)
- [x] Error handling with toast on export failure
- [x] Summary cards match exported data (same query/filter)
- [x] Export buttons (CSV, Excel, Print) on every report type
- [x] Empty state for reports with no data ("No data available")
- [x] Do not break existing functionality (RTL/LTR, Arabic/English, Data Import, Orders, Finance)

## ========================== MY PROFILE / بياناتي ==========================

- [x] Backend: getMyProfile procedure - returns user + linked employee + linked mandoub data
- [x] Backend: requestMyProfileEdit - creates approval request with oldData/newData snapshots (only personal fields)
- [x] Backend: directUpdateUserProfile - Manager/DirectEditUserProfile permission can update immediately + audit log
- [x] Backend: approveProfileEditRequest - applies newDataSnapshot on approval, rejects keeps old data + audit log
- [x] Backend: Security - reject role/jobTitle/permissions/status changes from normal profile edit
- [x] Backend: Security - normal user can only load/edit their own profile
- [x] Frontend: MyProfile page with header card (photo, name, role, job title, status badge)
- [x] Frontend: Personal Information section (name, phone, email, wilayat, status, dates)
- [x] Frontend: Work Information section (role, job title, user type, manager, wilayat, permissions summary)
- [x] Frontend: Linked Employee section (if user has employee profile)
- [x] Frontend: Linked Mandoub section (if user has mandoub profile)
- [x] Frontend: Edit Profile form (only personal fields for normal users)
- [x] Frontend: Submit Change Request flow with pending approval message
- [x] Frontend: Show pending approval status if active request exists
- [x] Frontend: PendingRoleAssignment page for users without role/permissions
- [x] Frontend: Navigation - add My Profile to user menu/profile dropdown
- [x] Frontend: Manager direct edit applies immediately without approval
- [x] Audit log entries for profile view, edit request, approval, rejection, direct update
- [x] Arabic/English translations for all profile labels
- [x] RTL/LTR support preserved
- [x] Profile photo display with default avatar fallback
- [x] Profile photo upload/change goes through approval for normal users
- [x] Do not break existing Data Import, Reports, Orders, Stores, Mandoubs, Approvals, Dashboard

## Fix: New Gmail Account Login Infinite Loading
- [x] New Gmail account login creates user with status=pending_role_assignment
- [x] New users redirect to Pending Role Assignment page (not dashboard)
- [x] No infinite loading on new account login
- [x] Safe fallback: Retry + Logout buttons if profile loading fails
- [x] Existing Manager and assigned users still log in normally

## Fix: Approval Security & Image Upload (Critical)

### Goal 1 — Prevent Self-Approval
- [x] Backend: reject approval if currentUser.id === approval.requestedByUserId (except Manager)
- [x] Return clear bilingual error message on self-approval attempt
- [x] Apply to all approval types (profile_edit, store_activation, mandoub_activation, etc.)
- [x] Audit log attempted self-approval

### Goal 2 — Strengthen Approval Authorization
- [x] Add approval permissions: ApproveProfileEdit, ApproveStoreActivation, ApproveMandoubActivation
- [x] Approver must have correct permission for the request type
- [x] Wilayat scope enforcement on approvals
- [x] Hierarchy check: approver must be higher role than requester
- [x] Full-access roles (manager, deputy_manager, state_employee_minister) can approve across system

### Goal 3 — Real Image Upload from Device
- [x] Backend: create upload endpoint with file type/size validation
- [x] Backend: store files via S3 storagePut, return URL
- [x] Frontend: reusable ImageUpload component (upload button, preview, URL fallback)
- [x] Integrate: User profile photo (MyProfile page)
- [x] Integrate: Store logo and cover image (Store edit/details)
- [x] Integrate: Product/menu images
- [x] Integrate: Mandoub profile photo
- [x] Integrate: Employee profile photo
- [x] Profile photo change by normal user goes through approval
- [x] Manager profile photo update applies directly
- [x] Arabic/English labels, RTL/LTR support
- [x] Security: validate file type server-side, reject non-images, sanitize filenames

## Fix: Missing Data Import P3 Translations
- [x] Add Arabic translations for import.bookings, import.bookingsDesc, import.coupons, import.couponsDesc, import.expenses, import.expensesDesc, import.storeDues, import.storeDuesDesc, import.settlements, import.settlementsDesc, import.complaints, import.complaintsDesc
- [x] Add English translations for the same keys
- [x] Verify no raw import.* keys visible in UI

## Fix: Priority 3 Relationship & Import Improvements
- [x] FIX 1: Add application-level relationship validation helper (server/helpers/validateRelationships.ts) — ready for wiring into modules
- [ ] FIX 2: Add Coupon Usage Import (coupon_usage type) with schema, backend procedure, frontend card
- [ ] FIX 3: Add bookingNumber field to bookings table, support in create/import/link
- [ ] FIX 4: Improve P3 imports - duplicate handling, update existing, relationship validation, correct history counts

## Fix: Add Order Form Auto-Fill with Searchable Dropdowns
- [ ] Backend: search endpoints for stores, customers, mandoubs, employees with wilayat scoping
- [ ] Frontend: reusable SearchableSelect component
- [ ] Store field: searchable dropdown, auto-fill classification/category/wilayat
- [ ] Customer field: searchable dropdown, auto-fill phone/address/wilayat
- [ ] Mandoub field: searchable dropdown, auto-fill name/phone/type
- [ ] Employee field: searchable dropdown
- [ ] Quick-create customer from Add Order form
- [ ] Quick-create store from Add Order form (if permission)
- [ ] Backend: save IDs (customerId, storeId, assignedMandoubId) on order creation
- [ ] Validation: wilayat access enforcement on selections
- [ ] Arabic/English labels and RTL/LTR support
