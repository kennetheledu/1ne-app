import { useEffect, useState } from "react";
import {
  getDecayHistoryFor,
  getMonthlySnapshotsFor,
  getTransactionsFor,
  getWallet,
  type MonthlySnapshotDoc,
  type TransactionDoc,
  type WalletDoc,
} from "./firebaseCallables";

export function useWallet(uid?: string | null) {
  const [wallet, setWallet] = useState<WalletDoc | null>(null);

  useEffect(() => {
    const refresh = async () => {
      if (!uid) {
        setWallet(null);
        return;
      }
      try {
        const w = await getWallet(uid);
        setWallet(w);
      } catch (error) {
        console.error("Failed to fetch wallet:", error);
        setWallet(null);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("1ne:db-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("1ne:db-changed", refresh);
    };
  }, [uid]);

  return wallet;
}

export function useTransactions(uid?: string | null, limit = 50) {
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!uid) {
        setTransactions([]);
        return;
      }
      try {
        const txs = await getTransactionsFor(uid, limit);
        setTransactions(txs);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("1ne:db-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("1ne:db-changed", refresh);
    };
  }, [uid, limit]);

  return transactions;
}

export function useDecayHistory(uid?: string | null, limit = 24) {
  const [history, setHistory] = useState<TransactionDoc[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!uid) {
        setHistory([]);
        return;
      }
      try {
        const hist = await getDecayHistoryFor(uid, limit);
        setHistory(hist);
      } catch (error) {
        console.error("Failed to fetch decay history:", error);
        setHistory([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("1ne:db-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("1ne:db-changed", refresh);
    };
  }, [uid, limit]);

  return history;
}

export function useMonthlySnapshots(uid?: string | null, limit = 12) {
  const [snapshots, setSnapshots] = useState<MonthlySnapshotDoc[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!uid) {
        setSnapshots([]);
        return;
      }
      try {
        const snaps = await getMonthlySnapshotsFor(uid, limit);
        setSnapshots(snaps);
      } catch (error) {
        console.error("Failed to fetch monthly snapshots:", error);
        setSnapshots([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("1ne:db-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("1ne:db-changed", refresh);
    };
  }, [uid, limit]);

  return snapshots;
}
