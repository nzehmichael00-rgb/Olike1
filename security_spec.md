# Security Specification: Olike Standard Rules Hardening

## 1. Data Invariants

1. **Profile Protection**: No user can elevate themselves to an admin (`isAdmin = true`) or modify another user's profile balance/metadata.
2. **Submission Integrity**: Regular users can only submit task proofs in `pending` status. Only admins are authorized to transition a submission's status to `approved` or `rejected`.
3. **Transaction Audit**: Transactions cannot be modified or deleted.
4. **Task Control**: Only admins or authorized campaign creators can create tasks.

---

## 2. The "Dirty Dozen" Payloads

The following payloads represent attacks designed to breach identity, integrity, and roles. All of these MUST return `PERMISSION_DENIED`.

1. **Self-Promotion Hack**: User attempts to create or update their own profile with `isAdmin = true`.
2. **Identity Spoofing**: User tries to update someone else's profile.
3. **Admin Panel Bypass**: Non-admin attempts to view all user profiles in the system.
4. **Balance Injection**: User attempts to update their own profile balance directly without doing any task.
5. **Auto-Verify Proof**: Non-admin user creates a task submission with `status: "approved"`.
6. **Task Hijack**: Non-admin user updates a task submission status to `approved`.
7. **Task Deletion**: Non-admin user attempts to delete active campaigns from the marketplace.
8. **Malicious ID injection**: User attempts to insert a 1MB string or invalid characters into the subcollection ID fields.
9. **Transaction Fraud**: User attempts to forge a transaction record with huge deposit amounts.
10. **Saved Account Theft**: User tries to read or write saved bank account info belonging to another user.
11. **Malicious Campaign Injection**: Non-signed-in user attempts to insert spam campaigns into the tasks collection.
12. **Double Upgrade Exploit**: User attempts to set `isPremium = true` without decrementing their wallet balance.

---

## 3. Test Cases (TDD Reference)

All of the above scenarios will be blocked directly inside the standard `firestore.rules` file by restricting path access, verifying schemas, checking caller identities, and validating data transitions.
