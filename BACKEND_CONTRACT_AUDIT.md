# STRICT BACKEND CONTRACT AUDIT
**Date:** May 28, 2026  
**Status:** NOT READY FOR FRONTEND REFACTOR

---

## 1. BACKEND CALLABLES INVENTORY

### Exported Firebase v2 Callables (29 total)

#### Read Callables (17)
1. **getMe** - No params → UserDoc (uid, email, displayName, role, inviteCode, relationshipId, partnerId, createdAt)
2. **getUser** - Params: uid → UserDoc  
3. **getWallet** - Params: uid → WalletDoc
4. **getTransactionsFor** - Params: uid, limit → TransactionDoc[]
5. **getMonthlySnapshotsFor** - Params: uid, limit → MonthlySnapshotDoc[]
6. **getDecayHistoryFor** - Params: uid, limit → TransactionDoc[] (filtered kind="decay")
7. **getTasksForUser** - Params: uid → TaskDoc[]
8. **getActiveTasks** - Params: uid → TaskDoc[] (filtered status in ["pending","active"])
9. **getThreads** - Params: uid → ThreadDoc[] (type, participants, linkedTaskId, linkedRequestId, createdAt)
10. **getThreadMessages** - Params: threadId → ThreadMessageDoc[] (id, favorRequestId, threadId, senderUid, text, reactions, createdAt)
11. **getFavorRequests** - Params: uid → FavorRequestDoc[] (by requesterUid)
12. **getFavorRequestsToReview** - Params: uid → FavorRequestDoc[] (by reviewerUid, filtered status)
13. **getFavorRequest** - Params: favorRequestId → FavorRequestDoc
14. **getNotificationsFor** - Params: uid → NotificationDoc[] (limit 50)
15. **markNotificationRead** - Params: uid, notificationId → {ok: true}
16. **sendThreadMessage** - Params: uid, threadId, text → {id, ok: true}
17. **toggleThreadReaction** - Params: uid, messageId, reaction → {ok: true}

#### Mutation Callables (12)
18. **awardPoints** - Params: uid, amount, reason → {ok: true}
19. **redeemPoints** - Params: uid, amount, reason → {ok: true}
20. **updateStreak** - Params: uid, performedAt? → {ok: true}
21. **completeTask** - Params: uid, taskId → {ok: true}
22. **revealTask** - Params: uid, taskId → {ok: true}
23. **submitFavorRequest** - Params: uid, title, description → {ok: true}
24. **assignFavorTier** - Params: uid, favorRequestId, tier, note → {ok: true}
25. **proposeFavorCounter** - Params: uid, favorRequestId, pointCost, note → {ok: true}
26. **acceptFavorAgreement** - Params: uid, favorRequestId → {ok: true}
27. **rejectFavorRequest** - Params: uid, favorRequestId, note → {ok: true}
28. **sendFavorThreadMessage** - Params: uid, favorRequestId, text → {ok: true}
29. **toggleFavorThreadReaction** - Params: uid, messageId, reaction → {ok: true}

#### Scheduled Tasks (4 - not callable from frontend)
- applyMonthlyDecay
- generateAiTaskPool
- assignDailyTasks
- expireDailyTasks

---

## 2. FRONTEND FUNCTION IMPORTS (Expected Callables)

### From `src/lib/useMe.ts`
- **getMe()** ✅ EXISTS as callable
- **type UserDoc** ✅ EXISTS in types

### From `src/lib/useWallet.ts`
- **getWallet(uid)** ✅ EXISTS
- **getTransactionsFor(uid, limit)** ✅ EXISTS
- **getDecayHistoryFor(uid, limit)** ✅ EXISTS
- **getMonthlySnapshotsFor(uid, limit)** ✅ EXISTS

### From `src/lib/useTasks.ts`
- **getTasksForUser(uid)** ✅ EXISTS
- **getActiveTasks(uid)** ✅ EXISTS
- **getMyAchievements(uid)** ❌ MISSING
- **getPendingApprovals(uid)** ❌ MISSING
- **getStreak(uid)** ❌ MISSING

### From `src/lib/useThreads.ts`
- **getThreadMessages(threadId)** ✅ EXISTS

### From `src/lib/auth.tsx`
- **getAuthUser()** ❌ MISSING (Auth SDK function, not callable)
- **onAuthStateChanged(callback)** ❌ MISSING (Auth SDK function, not callable)
- **signInWithEmail(email, pass)** ❌ MISSING (Auth SDK function, not callable)
- **signUpWithEmail(email, pass, name)** ❌ MISSING (Auth SDK function, not callable)
- **signOutUser()** ❌ MISSING (Auth SDK function, not callable)

### From `src/pages/Partner.tsx`
- **linkPartner(uid, code)** ❌ MISSING
- **unlinkPartner(uid)** ❌ MISSING
- **regenerateInviteCode(uid)** ❌ MISSING
- **getPartner(me)** ❌ MISSING (utility function, not callable)
- **getStreak(uid)** ❌ MISSING
- **getUser(uid)** ✅ EXISTS

### From `src/pages/Wallet.tsx`
- **getMonthlyCapProgress(wallet)** ❌ MISSING (utility function, not callable)
- **getPartner(me)** ❌ MISSING (utility function, not callable)
- **simulateMonthlyDecay(uid)** ❌ MISSING (admin dev function)

### From `src/pages/Favors.tsx`
- **getFavorRequests(uid)** ✅ EXISTS
- **getFavorRequestsToReview(uid)** ✅ EXISTS
- **submitFavorRequest(uid, title, desc, tier, cost)** ⚠️ PARAM MISMATCH
- **respondToFavorRequest(uid, id, action, tier?, cost?, note?)** ❌ MISSING
- **respondToCounter(uid, id, action)** ❌ MISSING
- **getNegotiationsFor(requestId)** ❌ MISSING
- **FAVOR_TIER_POINTS** ❌ MISSING (constant)

### From `src/pages/Threads.tsx`
- **sendThreadMessage(uid, threadId, text)** ✅ EXISTS
- **toggleReaction(uid, messageId, emoji)** ⚠️ NAMED MISMATCH (backend: toggleThreadReaction)
- **getThreads(uid)** ✅ EXISTS
- **respondToFavorRequest(...)** ❌ MISSING
- **respondToCounter(...)** ❌ MISSING
- **getFavorRequest(id)** ✅ EXISTS

### From `src/pages/Tasks.tsx`
- **approveTaskSubmission(uid, submissionId)** ❌ MISSING
- **createTaskViaAdmin(...)** ❌ MISSING
- **rejectTaskSubmission(uid, submissionId, note)** ❌ MISSING
- **revealSurpriseTask(uid, taskId)** ⚠️ PARAM MISMATCH (backend: revealTask with uid, taskId)
- **sendThreadMessage(...)** ✅ EXISTS
- **submitTaskCompletion(uid, taskId, note)** ❌ MISSING
- **toggleReaction(uid, messageId, emoji)** ⚠️ NAMED MISMATCH
- **getSubmissionTask(submissionId)** ❌ MISSING
- **DIFFICULTY_POINTS** ❌ MISSING (constant)
- **getPartner(me)** ❌ MISSING

---

## 3. CRITICAL MISMATCHES

### Category A: Missing Callables (BLOCKING)
1. **getMyAchievements** - Used by useTasks.ts, no backend equivalent
2. **getPendingApprovals** - Used by useTasks.ts, no backend equivalent
3. **getStreak** - Used by useTasks.ts, Partner.tsx, no backend equivalent
4. **linkPartner** - Used by Partner.tsx, no backend callable
5. **unlinkPartner** - Used by Partner.tsx, no backend callable
6. **regenerateInviteCode** - Used by Partner.tsx, no backend callable
7. **respondToFavorRequest** - Used by Threads.tsx, Favors.tsx, CRITICAL for negotiations
8. **respondToCounter** - Used by Threads.tsx, Favors.tsx, CRITICAL for counters
9. **getNegotiationsFor** - Used by Favors.tsx, no backend equivalent
10. **approveTaskSubmission** - Used by Tasks.tsx, no backend callable
11. **rejectTaskSubmission** - Used by Tasks.tsx, no backend callable
12. **submitTaskCompletion** - Used by Tasks.tsx, no backend callable
13. **getSubmissionTask** - Used by Tasks.tsx, no backend callable
14. **simulateMonthlyDecay** - Used by Wallet.tsx (admin demo only), no backend callable
15. **signInWithEmail** - Auth function (SDK-level, not callable-based)
16. **signUpWithEmail** - Auth function (SDK-level, not callable-based)
17. **signOutUser** - Auth function (SDK-level, not callable-based)
18. **getAuthUser** - Auth function (SDK-level, not callable-based)
19. **onAuthStateChanged** - Auth function (SDK-level, not callable-based)

### Category B: Parameter Mismatches (BLOCKING)
1. **submitFavorRequest**
   - Backend expects: uid, title, description
   - Frontend expects: uid, title, description, tier, pointCost
   - Impact: Frontend form uses tier selector and point cost that backend doesn't accept

2. **revealTask** / **revealSurpriseTask** naming
   - Backend exports: revealTask(uid, taskId)
   - Frontend imports: revealSurpriseTask(uid, taskId)
   - Impact: Import mismatch, function would fail

### Category C: Naming Mismatches (BLOCKING)
1. **toggleReaction** vs **toggleThreadReaction**
   - Backend: toggleThreadReaction(uid, messageId, reaction)
   - Frontend: toggleReaction(uid, messageId, emoji)
   - Used in: Tasks.tsx, Threads.tsx
   - Impact: Direct call would fail

2. **toggleFavorThreadReaction** (backend) vs none (frontend use)
   - Frontend doesn't import this, but exists in backend
   - Used for favor thread reactions (separate from task threads)
   - Impact: Feature incomplete in frontend

### Category D: Utility Functions (Missing)
1. **getPartner(me)** - Used in 4 files, needs frontend implementation
2. **getMonthlyCapProgress(wallet)** - Used in Wallet.tsx, needs frontend calculation
3. **FAVOR_TIER_POINTS** - Constant reference missing
4. **DIFFICULTY_POINTS** - Constant reference missing

### Category E: Auth Functions (Architecture Issue)
Frontend expects Firebase Auth wrapper functions that don't exist:
- `getAuthUser()` - Should use Firebase Auth SDK directly
- `signInWithEmail()` - Should use Firebase Auth SDK directly
- `signUpWithEmail()` - Should use Firebase Auth SDK directly
- `signOutUser()` - Should use Firebase Auth SDK directly
- `onAuthStateChanged()` - Should use Firebase Auth SDK directly

These are SDK functions, not Cloud Functions, and should be imported from `firebase/auth` not from firebase.ts

---

## 4. FIRESTORE COLLECTIONS ACCESSED

### Backend Access Pattern
Backend callables access these collections:
- **users** (direct reads via uid)
- **wallets** (direct reads via uid)
- **transactions** (collection queries with where/orderBy)
- **monthlySnapshots** (collection queries with where/orderBy)
- **tasks** (collection queries with where/orderBy/array-contains)
- **threads** (collectionGroup queries with array-contains)
- **messages** (collectionGroup queries)
- **favorRequests** (collection queries with where/orderBy)
- **notifications** (collection queries with where/orderBy)

### Missing Collections
Frontend expects data from collections that have no backend callables:
- **achievements** (for getMyAchievements)
- **streak** (for getStreak)
- **taskSubmissions** (for getPendingApprovals, approveTaskSubmission, rejectTaskSubmission)
- **negotiations** (for getNegotiationsFor)

---

## 5. DATA SHAPE VERIFICATION

### Verified Compatible Shapes ✅
- **UserDoc**: Backend returns {uid, email, displayName, role, inviteCode, relationshipId, partnerId, createdAt} - matches firebaseTypes.ts
- **WalletDoc**: Backend returns all required fields with timestamps as milliseconds - matches expected shape
- **TransactionDoc**: Backend returns all required fields - matches expected shape
- **TaskDoc**: Backend returns task fields but schema may differ slightly - NEEDS VALIDATION
- **ThreadDoc**: Backend returns {type, participants, linkedTaskId, linkedRequestId, createdAt} - LIMITED vs frontend expected
- **FavorRequestDoc**: Backend returns all expected fields - matches expected shape
- **NotificationDoc**: Backend returns {id, userId, title, body, type, read, createdAt} - matches expected shape

### Incompatible Data Shapes ⚠️
- **TaskDoc backend vs frontend frontend expects**:
  - Backend field: `category, title, prompt, difficulty, rewardValue, status, surprise, revealed, assignedForDay, sourcePoolId, expiresAt, completedAt, completedBy, createdAt`
  - Frontend field: `id, title, description, taskType, difficulty, points, assignedTo[], createdBy, status, revealed, requiresApproval, relationshipId, assignedPartner, submissionLocked, expiresAt, completedAt, completedBy, submissionNote, rejectionNote, counterNote, counterPoints, threadId, archivedAt, expiredAt, resetDay, createdAt`
  - Major mismatches: points vs rewardValue, createdBy vs ownerUid, missing submission/rejection/counter/archive fields

- **ThreadDoc**:
  - Backend returns minimal shape
  - Frontend expects full ThreadDoc with status and other fields
  - Missing: status, inferred from linkedTaskId type

- **MessageDoc vs ThreadMessageDoc**:
  - Frontend types.ts: MessageDoc (id, threadId, senderUid, text, reactions{MessageReaction[]}, createdAt)
  - Backend returns: ThreadMessageDoc (id, favorRequestId, threadId, senderUid, text, reactions, createdAt)
  - Extra field: favorRequestId in backend (correct but frontend types missing it)

---

## 6. MISSING CORE FEATURES

### User Relationship Management
- ❌ `linkPartner(uid, inviteCode)` - No backend callable
- ❌ `unlinkPartner(uid)` - No backend callable
- ❌ `regenerateInviteCode(uid)` - No backend callable
- ❌ `getPartner(user)` - Utility function needed

### Task Submission Workflow
- ❌ `submitTaskCompletion(uid, taskId, note)` - No backend callable
- ❌ `approveTaskSubmission(uid, submissionId)` - No backend callable
- ❌ `rejectTaskSubmission(uid, submissionId, note)` - No backend callable
- ❌ `getSubmissionTask(submissionId)` - No backend callable
- ⚠️ `getMyAchievements()` - No backend data source

### Favor Negotiation Workflow
- ❌ `respondToFavorRequest(uid, requestId, action, tier?, cost?, note?)` - Combines 3 backend operations into 1 function
  - Should call: assignFavorTier + proposeFavorCounter + rejectFavorRequest based on action
- ❌ `respondToCounter(uid, requestId, action)` - Maps to acceptFavorAgreement + rejectFavorRequest
- ❌ `getNegotiationsFor(requestId)` - No backend data source
- ⚠️ `submitFavorRequest` params mismatch - frontend passes tier+cost, backend doesn't use them

### Admin Features
- ❌ `createTaskViaAdmin(data)` - No backend callable
- ❌ `simulateMonthlyDecay(uid)` - No backend callable (should exist for dev)

### Streak Tracking
- ❌ `getStreak(uid)` - No backend callable
  - Backend has `updateStreak()` but no corresponding getter
  - Used by: useStreak, Partner.tsx, Tasks.tsx
  - Must read from wallet.currentStreak or dedicated streak collection

---

## 7. FIREBASE MAPPING ISSUES

### Frontend Imports from Non-Existent Source
File `src/lib/firebase.ts` currently only re-exports types and firebaseClient.
Frontend hooks import functions from it that don't exist anywhere:
- useMe.ts: `import { getMe }`
- useWallet.ts: `import { getWallet, getTransactionsFor, ... }`
- useTasks.ts: `import { getTasksForUser, getMyAchievements, ... }`
- useThreads.ts: `import { getThreadMessages }`
- auth.tsx: `import { signInWithEmail, ... }`

**Root cause**: No wrapper layer exists to convert backend callables into synchronous frontend functions.

### Missing Frontend-Callable Integration
Frontend is attempting to use async Cloud Functions as synchronous functions:
```typescript
// useTasks.ts: useDb<TaskDoc[]>(() => uid ? getTasksForUser(uid) : [], ...)
// This won't work - getTasksForUser is async (callable), but useDb expects sync
```

---

## 8. SUMMARY TABLE

| Component | Status | Issue | Severity |
|-----------|--------|-------|----------|
| getMe | ✅ READY | None | - |
| getUser | ✅ READY | None | - |
| getWallet | ✅ READY | None | - |
| getTransactionsFor | ✅ READY | None | - |
| getMonthlySnapshotsFor | ✅ READY | None | - |
| getDecayHistoryFor | ✅ READY | None | - |
| getTasksForUser | ⚠️ PARTIAL | Data shape mismatch, no callable wrapper | HIGH |
| getActiveTasks | ⚠️ PARTIAL | Data shape mismatch, no callable wrapper | HIGH |
| getThreads | ✅ READY | No callable wrapper | MEDIUM |
| getThreadMessages | ✅ READY | No callable wrapper | MEDIUM |
| toggleThreadReaction | ✅ READY | Naming mismatch (toggleReaction vs toggleThreadReaction) | MEDIUM |
| getFavorRequests | ✅ READY | No callable wrapper | MEDIUM |
| getFavorRequestsToReview | ✅ READY | No callable wrapper | MEDIUM |
| getFavorRequest | ✅ READY | No callable wrapper | MEDIUM |
| getNotificationsFor | ✅ READY | No callable wrapper | MEDIUM |
| markNotificationRead | ✅ READY | No callable wrapper | MEDIUM |
| **Auth functions** | ❌ MISSING | 5 functions need Auth SDK setup | CRITICAL |
| **Partner functions** | ❌ MISSING | 3 functions, no backend equivalents | HIGH |
| **Task submissions** | ❌ MISSING | 4 functions, no backend equivalents | CRITICAL |
| **Favor negotiations** | ❌ MISSING | 2 functions, parameter/action mapping unclear | CRITICAL |
| **Streaks** | ❌ MISSING | No getter, only setter in backend | HIGH |
| **Achievements** | ❌ MISSING | No backend data source | MEDIUM |
| **Admin functions** | ❌ MISSING | 2 functions, no backend equivalents | LOW |

---

## 9. BLOCKERS PREVENTING FRONTEND REFACTOR

### CRITICAL BLOCKERS (Must fix before frontend refactor starts)
1. **Auth system not implemented** - signIn/signUp/signOut functions missing
2. **Callable wrapper layer missing** - Frontend can't call async callables from sync contexts
3. **Task submission workflow incomplete** - No approve/reject callables
4. **Favor negotiation workflow unclear** - respondToFavorRequest needs backend design
5. **Data shape mismatches** - TaskDoc schema different between backend and frontend expected
6. **getStreak() missing** - Used by 3 pages, no backend getter

### HIGH PRIORITY BLOCKERS
7. **Partner management callables missing** - linkPartner, unlinkPartner, regenerateInviteCode
8. **submitFavorRequest parameter mismatch** - Frontend sends tier+cost, backend doesn't accept
9. **Naming conflicts** - toggleReaction vs toggleThreadReaction
10. **Achievements system missing** - No backend support

### MEDIUM PRIORITY
11. **Admin dev functions** - simulateMonthlyDecay, createTaskViaAdmin
12. **Utility functions missing** - getPartner, getMonthlyCapProgress
13. **Constants undefined** - FAVOR_TIER_POINTS, DIFFICULTY_POINTS

---

## 10. REQUIRED ACTIONS BEFORE PROCEEDING

### Phase 1: Design & Planning
- [ ] Determine if submitFavorRequest should accept tier/cost parameters or if frontend should call separate callables
- [ ] Design respondToFavorRequest mapping: which backend callables should it delegate to?
- [ ] Define getStreak callable (read from wallet or separate collection?)
- [ ] Plan task submission workflow: what callables needed for submit/approve/reject cycle?
- [ ] Confirm data shape compatibility for TaskDoc field mapping

### Phase 2: Backend Implementation
- [ ] Create getStreak(uid) callable
- [ ] Create linkPartner(uid, inviteCode) callable
- [ ] Create unlinkPartner(uid) callable
- [ ] Create regenerateInviteCode(uid) callable
- [ ] Create submitTaskCompletion(uid, taskId, note) callable
- [ ] Create approveTaskSubmission(uid, submissionId) callable
- [ ] Create rejectTaskSubmission(uid, submissionId, note) callable
- [ ] Create getMyAchievements(uid) callable
- [ ] Create getNegotiationsFor(requestId) callable
- [ ] Create getSubmissionTask(submissionId) callable
- [ ] Clarify submitFavorRequest behavior with tier/cost parameters
- [ ] Fix submitFavorRequest to accept additional params if needed

### Phase 3: Frontend Implementation
- [ ] Create async callable wrapper functions in src/lib/firebase.ts
- [ ] Implement getPartner utility function
- [ ] Implement getMonthlyCapProgress utility function
- [ ] Create FAVOR_TIER_POINTS constant
- [ ] Create DIFFICULTY_POINTS constant
- [ ] Set up Firebase Auth SDK integration for sign in/up/out
- [ ] Fix callable naming: toggleReaction wrapper for toggleThreadReaction
- [ ] Update all hooks to handle async callable returns properly
- [ ] Update all pages to use wrapped callable functions

### Phase 4: Integration Testing
- [ ] Verify TaskDoc data shape from backend matches frontend expectations
- [ ] Test all callables with real Firestore data
- [ ] Test auth flow end-to-end
- [ ] Test task submission workflow
- [ ] Test favor negotiation workflow
- [ ] Test partner linking/unlinking

---

## CONCLUSION

### NOT READY FOR FRONTEND REFACTOR

**Critical Issues:**
- 19+ missing callables that frontend depends on
- 3+ parameter/naming mismatches in exported callables
- Callable wrapper integration layer not implemented
- Auth system not set up
- Data shape mismatches for TaskDoc
- No synchronous call support for async callables

**Estimated Effort:**
- Backend callables: 8-12 hours
- Frontend wrapper layer: 4-6 hours
- Integration testing: 4-8 hours
- **Total: 16-26 hours before frontend refactor can begin**

**Recommendation:**
Complete all Phase 1-4 actions above before proceeding with any frontend refactor work.

