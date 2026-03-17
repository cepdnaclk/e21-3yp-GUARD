# Branch Collaboration Protocol — G.U.A.R.D

> **Project**: General Unit for Aquatic Risk Detection  
> **Active Branches**: `main`, `your-branch` (feature development), `Test_branch` (testing)  
> **Last Updated**: March 17, 2026

---

## Overview

This document establishes the collaboration protocol between your feature development branch and the Test_branch (testing branch). Both branches diverge from `main` with shared code changes and require coordination to avoid merge conflicts and maintain code quality.

**Branch Responsibilities:**

| Branch       | Owner      | Purpose                     | Sync Target |
| ------------ | ---------- | --------------------------- | ----------- |
| `main`       | Lead       | Production-ready code only  | All         |
| your-branch  | You        | Feature development         | Test_branch |
| Test_branch  | QA Team    | Testing existing features   | main        |

---

## Sync Schedule

**Weekly Sync Protocol** (recommended cadence):

- **Monday 9 AM**: Test_branch rebases onto main, pulls latest
- **Wednesday 2 PM**: Your branch rebases onto Test_branch (to absorb any bug fixes)
- **Friday 4 PM**: Both branches rebase onto main, resolve conflicts, prepare for merge

**Ad-hoc Sync:**

- After completing a feature milestone
- Before pushing to `main`
- When a critical bug is discovered that affects both branches

---

## Merge Direction & Strategy

### Your Branch → Test_branch (New Features)

**When**: After completing a feature module (e.g., new alert type, device registration enhancement)

**Process**:

```bash
# From your-branch
git commit -m "feat: [module] brief description"
git push origin your-branch

# Open a PR: your-branch → Test_branch
# Include: description, scope, testing notes
# Wait for Test_branch team to review + test locally
```

**Merge Method**: **Squash + Merge** (keeps test branch history clean)

**Test_branch signs off**: ✅ Features work as documented, no regression

### Test_branch → Your Branch (Bug Fixes & Insights)

**When**: Test_branch finds a bug or fixes an issue applicable to your features

**Process**:

```bash
# From Test_branch
git commit -m "fix: [module] issue detected, root cause"
git push origin Test_branch

# Your branch integrates this fix
git fetch origin
git rebase origin/Test_branch
```

**Merge Method**: **Rebase + Fast-forward** (chronological history)

**Your branch responsibility**: Verify the fix doesn't break your work

### Both Branches → main (Release)

**When**: Weekly release (Friday EOD) or critical hotfix

**Process**:

```bash
# From your-branch
git fetch origin
git rebase origin/main
# If conflicts occur → resolve locally + push
git push origin your-branch

# Same for Test_branch
git fetch origin
git rebase origin/main
git push origin Test_branch

# Create PR: your-branch → main (for code review)
# Create PR: Test_branch → main (for QA sign-off)
# Merge after all checks pass
```

**Merge Method**: **Merge commit** (preserves branch history for releases)

---

## Conflict Resolution

### Priority Order (Escalation)

1. **Test_branch takes precedence**: Bug fixes and test findings → accepted as-is
2. **Your branch leads**: Feature design decisions → override test branch suggestions
3. **Code review arbitrates**: If both have conflicting changes to the same file
4. **Project lead decides**: If neither rule applies

### Common Conflict Scenarios

**Scenario A: Schema Changes (schema.prisma)**

- Your branch: Adds a new field to `devices` table
- Test_branch: Modifies the same field for testing
- **Resolution**: Your branch's schema wins (design authority). Test_branch adjusts test fixtures.
- **Action**: Test_branch rebases, updates test data, retests

**Scenario B: API Endpoint Changes**

- Your branch: Modifies `POST /devices` request body
- Test_branch: Tests the old endpoint structure
- **Resolution**: Test_branch's tests are outdated. Your branch provides migration guide in commit message.
- **Action**: Document breaking change in commit. Test_branch updates test suite.

**Scenario C: Alert Rules or Thresholds**

- Your branch: Changes alert threshold logic
- Test_branch: Expects different behavior
- **Resolution**: Code review determines correct behavior. Both follow the decision.
- **Action**: Create issue for clarification. Both branches wait for external input.

---

## Code Review Checklist for Feature PRs

**Before merging your-branch → Test_branch:**

- [ ] Version bump in `package.json` (if applicable)
- [ ] Commit message follows convention: `feat:`, `fix:`, `docs:`
- [ ] `.env.example` updated if new env vars added
- [ ] Database migration created (if schema changed)
  - Tested locally: `npx prisma migrate dev`
  - Migration name is descriptive (e.g., `add_alert_history`)
- [ ] New endpoints documented in README.md or inline comments
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] `npm run lint` passes locally (if linter configured)
- [ ] Manual testing performed on local dev stack
- [ ] MQTT integration verified if relevant (if using test MQTT pub)

**Test_branch verifies:**

- [ ] Backend starts without errors: `npm run dev`
- [ ] Database migrations apply cleanly
- [ ] MQTT broker connects successfully
- [ ] REST API endpoints respond correctly
- [ ] WebSocket alert events broadcast properly
- [ ] No regressions in existing features

---

## Communication & Notifications

### Slack/Email Updates

- **Post merge PRs** to team channel with summary
- **Tag @Test_branch** when new features are ready
- **Flag blockers** immediately (e.g., "Waiting for API spec clarification")

### PR Title Format

```
[FEATURE] Device registration overhaul
[BUGFIX] Alert deduplication race condition  
[DOCS] API reference for POST /sensors
[RELEASE] v2.2.0 — Login by email support
```

### Commit Message Format

```
feat: add multi-device support for ESP32 clusters

- Allows one user to manage 100+ devices
- Updates schema: device.cluster_id (optional)
- Adds GET /devices/:cluster_id/list endpoint

Closes #23
```

---

## Rollback Procedure

If a merge to `main` causes a critical issue:

1. **Identify the culprit commit**:
   ```bash
   git log --oneline main | head -20
   git show <commit-hash>
   ```

2. **Revert the commit**:
   ```bash
   git revert <commit-hash>
   git push origin main:main
   ```

3. **Notify both branches**:
   - Post in team channel: "Reverted commit [hash] due to [issue]"
   - Both branches rebase onto updated `main`

4. **Root cause analysis**:
   - Create an issue documenting the problem
   - Agree on how to prevent it next time

---

## Branch Status Dashboard

**Use this template weekly:**

| Branch       | Last Sync   | Commits Ahead | Status      | Blocker? |
| ------------ | ----------- | ------------- | ----------- | -------- |
| your-branch  | Fri 4:15 PM | +5            | ✅ Ready    | None     |
| Test_branch  | Fri 4:12 PM | +2            | 🔄 Testing  | None     |

Update this in the team Slack/doc every Friday EOD.

---

## Onboarding Checklist (For New Team Members)

- [ ] Clone the repository
- [ ] Follow [DEVELOPMENT.md](DEVELOPMENT.md) for local setup
- [ ] Run pull from `main` branch locally
- [ ] Verify backend starts: `npm run dev`
- [ ] Understand branch responsibilities in this file
- [ ] Confirm database and MQTT are running
- [ ] Ask questions in team channel

---

## Questions & Escalation

**For merge conflicts** → Consult [MERGE_STRATEGY.md](MERGE_STRATEGY.md)

**For local setup issues** → Consult [DEVELOPMENT.md](DEVELOPMENT.md)

**For unclear scope** → Escalate to project lead with context

---

**Last edited**: March 17, 2026  
**Next review**: April 17, 2026
