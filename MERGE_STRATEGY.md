# Merge Strategy & Conflict Resolution Guide

> **Purpose**: Detailed technical guide for handling git merges, rebases, and conflict resolution between G.U.A.R.D branches.

---

## Quick Reference

| Scenario                     | Command                                      | Merge Type |
| ---------------------------- | -------------------------------------------- | ---------- |
| Feature ready for testing    | `git merge --squash Test_branch my-feature` | Squash     |
| Integrate bug fix            | `git rebase origin/Test_branch`              | Rebase     |
| Release to main              | `git merge --no-ff main my-feature`          | Merge      |
| Abort a merge/rebase         | `git merge --abort` / `git rebase --abort`  | —          |
| View merge conflicts         | `git status`                                  | —          |

---

## Merge Types Explained

### 1. Squash + Merge (Feature PRs)

**Used for**: Your branch → Test_branch (feature submissions)

**What it does**: Consolidates all your commits into one, keeping Test_branch history clean.

**Command**:

```bash
# From Test_branch
git fetch origin
git merge --squash origin/my-feature
git commit -m "feat: comprehensive feature description"
git push origin Test_branch
```

**When to use**:

- Merging completed features (modules with multiple commits)
- You want a clean history on the receiving branch

**When NOT to use**:

- Integrating bug fixes (use rebase instead)
- Historical context is important (use merge --no-ff)

---

### 2. Rebase + Fast-Forward (Bug Fixes)

**Used for**: Test_branch → Your branch (bug fixes, hotfixes)

**What it does**: Moves your commits on top of the latest test branch changes, avoiding merge commits.

**Command**:

```bash
# From my-feature
git fetch origin
git rebase origin/Test_branch

# If conflicts occur:
# (resolve conflicts in editor)
git add <conflicted-files>
git rebase --continue

# Force push (because history rewrote)
git push origin my-feature --force-with-lease
```

**When to use**:

- Pulling in bug fixes from test branch
- You want a linear history
- Reorder commits for clarity

**When NOT to use**:

- Merging to main (use merge commit for history)
- Collaborative branches (others may have pulled your commits)

**⚠️ Force-push safety**:

- Always use `--force-with-lease` (safer than `--force`)
- Notify Test_branch if they've pulled your feature branch recently

---

### 3. Merge Commit (Release to main)

**Used for**: Your branch → main OR Test_branch → main (releases)

**What it does**: Creates a merge commit preserving both branch histories.

**Command**:

```bash
# From main
git fetch origin
git merge --no-ff origin/my-feature
git push origin main

# or (with commit message)
git merge --no-ff -m "Merge branch 'my-feature' into main" origin/my-feature
```

**When to use**:

- Merging to production (main)
- You want to preserve evidence of the merge
- Release timestamps matter

**When NOT to use**:

- Internal syncing between feature/test branches (too noisy)

---

## Conflict Resolution Walkthrough

### Step 1: Identify the Conflict

```bash
git status

# Output:
# both modified:   code/backend/src/app.js
# both modified:   code/backend/prisma/schema.prisma
# both deleted:    docs/old-api.md
# added by us:     code/backend/src/modules/alerts/newAlert.js
# added by them:   code/backend/src/modules/devices/newDevice.js
```

### Step 2: Choose Resolution Strategy Based on File Type

#### **Schema Changes (prisma/schema.prisma)**

**Conflict pattern**:

```prisma
<<<<<<< HEAD (your-branch)
model Device {
  id        Int     @id @default(autoincrement())
  name      String
  userId    Int
  clusterId Int?    // <-- Your addition
  @@index([userId])
  @@index([clusterId])  // <-- Your addition
}
=======
model Device {
  id        Int     @id @default(autoincrement())
  name      String
  userId    Int
  latitude  Float?  // <-- Test_branch addition
  longitude Float?  // <-- Test_branch addition
  @@index([userId])
}
>>>>>>> Test_branch
```

**Resolution strategy**:

✅ **Combine both additions** (if logically independent):

```prisma
model Device {
  id        Int     @id @default(autoincrement())
  name      String
  userId    Int
  clusterId Int?    // From your-branch
  latitude  Float?  // From Test_branch
  longitude Float?  // From Test_branch
  @@index([userId])
  @@index([clusterId])
  @@index([latitude, longitude])
}
```

```bash
# After editing
git add code/backend/prisma/schema.prisma
git rebase --continue  # (if rebasing) OR git merge --continue (if merging)
```

❌ **DO NOT**: Pick one side randomly. Understand what each change does first.

---

#### **API Route Changes (src/app.js or routes)**

**Conflict pattern**:

```javascript
// <<<<<<< HEAD (your-branch)
app.post('/devices', authenticate, validateRequest, deviceController.createDevice);
app.get('/devices/:id/cluster', authenticate, deviceController.getCluster);
// =======
// app.post('/devices', authenticate, validateRequest, deviceController.registerDevice);
// app.get('/devices/:id/sensors', authenticate, sensorController.getSensorsByDevice);
// >>>>>>> Test_branch
```

**Resolution strategy**:

**Consult README.md for the canonical endpoint** → Keep whichever is documented there.

If both are valid but different:

- `createDevice` vs `registerDevice` → Pick one naming convention (e.g., always use `create*`)
- Keep both endpoints if they serve different purposes (different request bodies or responses)

```javascript
// Resolved: Keep both if they're different operations
app.post('/devices', authenticate, validateRequest, deviceController.createDevice); // Register
app.get('/devices/:id/cluster', authenticate, deviceController.getCluster);        // Your feature
app.get('/devices/:id/sensors', authenticate, sensorController.getSensorsByDevice);// Test_branch
```

---

#### **Alert Rules or Thresholds (config/config.js)**

**Conflict pattern**:

```javascript
// <<<<<<< HEAD (your-branch)
alertThresholds: {
  TEMP_HIGH: 35,  // Increased from 32
  TEMP_LOW: 18,   // Decreased from 20
}
// =======
// alertThresholds: {
//   TEMP_HIGH: 32,
//   TEMP_LOW: 20,
//   PH_HIGH: 8.2,  // New rule
// }
// >>>>>>> Test_branch
```

**Resolution strategy**:

**Check which branch has authority**:

- If your branch is feature development → Your thresholds may be intentional (keep)
- If Test_branch is testing → They may have discovered better values → Consult project lead

**Compromise**: Use environment variables:

```javascript
alertThresholds: {
  TEMP_HIGH: process.env.TEMP_MAX || 35,
  TEMP_LOW: process.env.TEMP_MIN || 18,
  PH_HIGH: process.env.PH_MAX || 8.2,
}
```

Update `.env.example` to document this.

---

#### **Documentation (README.md)**

**Conflict pattern**:

```markdown
<<<<<<< HEAD
### New Feature: Device Clustering
- Allows grouping multiple devices
- Reduces latency on queries
- See API reference for clusterId
=======
### Feature: Geolocation Sensors
- Adds latitude/longitude tracking
- Improves IoT device mapping
>>>>>>> Test_branch
```

**Resolution strategy**:

✅ **Merge both sections** (assume additive):

```markdown
### New Features

#### Device Clustering
- Allows grouping multiple devices
- Reduces latency on queries
- See API reference for clusterId

#### Geolocation Sensors
- Adds latitude/longitude tracking
- Improves IoT device mapping
```

---

### Step 3: Validate the Resolution

**After resolving all conflicts**:

```bash
# If rebasing
git add .
git rebase --continue

# If merging
git add .
git merge --continue
```

**Then verify the code compiles**:

```bash
cd code/backend
npm install
npm run lint        # (if configured)
npm run test        # (if tests exist)
npm run dev         # Verify backend starts
```

**For database changes**:

```bash
# Test the migration
npx prisma migrate dev --name test_merge
npx prisma generate
```

**Push your branch**:

```bash
git push origin my-feature
```

---

## Dangerous Situations

### ⚠️ When Main Changes While You're Developing

**Scenario**: You branched from `main` on Monday. Test_branch merges a critical fix to `main` on Wednesday.

**Solution**:

```bash
git fetch origin
git rebase origin/main

# Resolve any conflicts
# Your branch now includes the fix
```

**Do NOT**: Merge `main` into your branch (creates unnecessary commits).

---

### ⚠️ Accidental Commit to Wrong Branch

**Scenario**: You committed to `my-feature` but meant to commit to `Test_branch`.

**Solution**:

```bash
# 1. Undo the commit on my-feature (keep changes)
git reset --soft HEAD~1

# 2. Stash the changes
git stash

# 3. Switch to the correct branch
git checkout Test_branch

# 4. Apply the changes
git stash pop
git add .
git commit -m "..."
```

---

### ⚠️ Force-Push Disaster

**Scenario**: You force-pushed to `my-feature`, but someone else had pulled it.

**Solution**:

```bash
# If you haven't pushed yet
git reflog  # Find your original commit
git reset --hard <original-commit-hash>

# If already pushed and others have pulled
# Notify them immediately in Slack
# They must: git pull origin my-feature --force
# Then continue with conflicts resolved
```

**Prevention**: Use `--force-with-lease` always.

---

## Real-World Example Walkthrough

### Scenario: Integrating Bug Fix from Test_branch

**Context**:

- Your branch: Added `clusterId` field to devices
- Test_branch: Fixed a race condition in the alert engine
- You need that fix in your branch

**Steps**:

```bash
# 1. Fetch latest from all branches
git fetch origin

# 2. Check your current status
git status
# On branch my-feature
# Your branch is up to date with origin/my-feature

# 3. Rebase onto Test_branch
git rebase origin/Test_branch
# First, rewinding head to replay your work on top of it...
# Applying: feat: add device clustering
# [conflict] Both modified: code/backend/prisma/schema.prisma

# 4. Check which file has conflicts
git status
# both modified:   code/backend/prisma/schema.prisma

# 5. Open schema.prisma and resolve
# (merge Test_branch's fix + your clustering changes)

# 6. Mark as resolved and continue
git add code/backend/prisma/schema.prisma
git rebase --continue
# Applying: feat: add device clustering
# [my-feature abc1234] feat: add device clustering

# 7. Verify locally
npm run dev

# 8. Force-push (because history changed)
git push origin my-feature --force-with-lease
```

**Result**: Your branch now includes the bug fix + your feature.

---

## Decision Tree: Which Merge Method?

```
Start
  │
  ├─ Merging TO main?
  │   ├─ YES → Use "merge --no-ff" (merge commit)
  │   └─ NO → Continue
  │
  ├─ Is it a bug fix FROM Test_branch?
  │   ├─ YES → Use "rebase" (fast-forward)
  │   └─ NO → Continue
  │
  ├─ Is it a feature TO Test_branch?
  │   ├─ YES → Use "merge --squash" (clean history)
  │   └─ NO → Continue
  │
  └─ Default → Use "rebase" (linear history)
```

---

## Prevention Tips

1. **Commit often, push often** → Smaller conflicts
2. **Communicate before starting work** → Avoid duplicate features
3. **Keep commits atomic** → Each commit does one thing
4. **Write descriptive commit messages** → Context for reviewers
5. **Run tests before pushing** → Catch issues early
6. **Review PR diffs carefully** → Spot conflicts before they happen

---

**Version**: 1.0  
**Last Updated**: March 17, 2026
