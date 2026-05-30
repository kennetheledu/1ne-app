/**
 * Frontend helper functions (no backend calls).
 * 
 * These are pure utility functions that compute values from data,
 * not callables to Cloud Functions.
 */

import type { UserDoc, WalletDoc } from "./firebaseTypes";

// ============================================================================
// WALLET HELPERS
// ============================================================================

export interface CapProgress {
  used: number;
  cap: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Compute the monthly redemption cap progress from wallet data.
 * No backend call; pure computation.
 */
export function getMonthlyCapProgress(wallet: WalletDoc): CapProgress {
  const monthlyRedeemed = wallet?.monthlyRedeemed ?? 0;
  const monthlyCap = 10;
  const remaining = monthlyCap - monthlyRedeemed;
  const percentUsed = monthlyCap > 0 ? Math.round((monthlyRedeemed / monthlyCap) * 100) : 0;
  return { used: monthlyRedeemed, cap: monthlyCap, remaining, percentUsed };
}

// ============================================================================
// USER HELPERS
// ============================================================================

/**
 * Extract partner uid from a user's doc (if partnered).
 * Returns null if no partner.
 * Note: To get partner details, use getUser(user.partnerId) separately.
 */
export function getPartner(user: UserDoc): { uid: string; displayName: string } | null {
  if (!user.partnerId) return null;
  // Return a placeholder - actual partner display name would require calling getUser()
  return {
    uid: user.partnerId,
    displayName: "Your partner",
  };
}

// ============================================================================
// DEMO HELPERS
// ============================================================================

/**
 * Demo function for simulating monthly decay (Wallet.tsx).
 * In production, this would be a scheduled Cloud Function.
 * Returns nothing; just logs to console for demo purposes.
 */
export function simulateMonthlyDecay(uid: string): void {
  console.log(`[DEMO] Simulating monthly decay for user ${uid}`);
  // In production, this would be: callFunction("applyMonthlyDecay", { uid })
  // For now, just a placeholder for Wallet demo UI
}
