# 1ne Firestore Schema — Favor Negotiation Economy

## Collections

### /users/{uid}
- uid
- email
- displayName
- role
- inviteCode
- relationshipId
- partnerId
- createdAt

### /relationships/{relId}
- id
- userA
- userB
- createdAt

### /wallets/{uid}
- ownerUid
- relationshipId
- balance
- lifetimeEarned
- lifetimeRedeemed
- lifetimeDecayed
- monthlyRedeemed
- monthlyCap
- currentMonthKey
- currentMonthStartedBalance
- monthlyEarned
- currentStreak
- bestStreak
- lastStreakDate
- createdAt
- updatedAt

### /transactions/{txnId}
Immutable append-only ledger written only by Cloud Functions.
- walletId
- ownerUid
- relationshipId
- kind (`award` | `redeem` | `decay` | `streak`)
- delta
- amount
- balanceAfter
- reason
- source (`cloud-function`)
- immutable (`true`)
- createdBy
- monthKey
- metadata
- createdAt

### /monthlySnapshots/{uid_YYYY-MM}
- walletId
- ownerUid
- relationshipId
- monthKey
- openingBalance
- earned
- redeemed
- decayed
- preDecayClosingBalance
- closingBalance
- redemptionCap
- redemptionUsed
- redemptionRemaining
- currentStreak
- lifetimeEarnedAtClose
- createdAt

### /tasks/{taskId}
- ownerUid
- relationshipId
- category
- title
- prompt
- difficulty
- rewardValue
- status
- surprise
- revealed
- assignedForDay
- sourcePoolId
- expiresAt
- completedAt
- completedBy
- createdAt

### /streaks/{uid}
- ownerUid
- relationshipId
- current
- best
- lastCompletionDay
- totalCompletions
- bonusPointsEarned
- history[]
- createdAt
- updatedAt

### /aiTaskPools/{poolId}
- category
- title
- prompt
- difficulty
- rewardValue
- surpriseEligible
- active
- generatedBy
- createdAt

### /favorRequests/{requestId}
Custom favor request submitted by one partner and reviewed by the other.
- relationshipId
- requesterUid
- reviewerUid
- title
- description
- status (`pending_review` | `negotiating` | `agreed` | `rejected`)
- assignedTier (`easy` | `medium` | `hard` | null)
- assignedPointCost
- currentPointCost
- lastProposalBy
- threadId
- agreementId
- rejectionNote
- createdAt
- reviewedAt
- updatedAt

### /negotiations/{negotiationId}
Persistent negotiation events for a favor request.
- favorRequestId
- relationshipId
- proposerUid
- proposalType (`tier` | `counter` | `agree` | `reject`)
- note
- proposedPointCost
- proposedTier
- createdAt

### /threadMessages/{messageId}
One negotiation thread per favor request.
- favorRequestId
- threadId
- senderUid
- text
- reactions
- createdAt

### /agreements/{agreementId}
Finalized favor deal with automatic point deduction.
- favorRequestId
- relationshipId
- requesterUid
- reviewerUid
- finalPointCost
- finalTier
- acceptedProposalId
- finalizedAt
- createdAt

### /auditLogs/{id}
- actor
- action
- target
- meta
- createdAt

### /notifications/{id}
- userId
- title
- body
- type
- read
- createdAt

## Enforcement Summary
- Users can read only their own wallet data or a linked partner's.
- Clients cannot write wallets, transactions, monthly snapshots, favor requests, negotiations, thread messages, or agreements directly.
- Cloud Functions exclusively award, deduct, decay, update streaks, create favor requests, negotiate point cost, and finalize agreements.
- Favor requests are private to the two linked partners in that relationship.
- Final agreement automatically deducts points from the requester wallet.
- All point deductions remain immutable in transaction and audit logs.
- Admins are visible but cannot create, review, counter, reject, or finalize favor agreements.
