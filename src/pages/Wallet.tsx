import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, RefreshCcw, Zap } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { WalletHero } from "../components/wallet/WalletHero";
import { TransactionList } from "../components/wallet/TransactionList";
import { useMe } from "../lib/useMe";
import { useDecayHistory, useTransactions, useWallet } from "../lib/useWallet";
import { Link } from "react-router-dom";
import { getMonthlyCapProgress, getPartner, simulateMonthlyDecay } from "../lib/firebase";

export function Wallet() {
  const me = useMe();
  const wallet = useWallet(me?.uid);
  const transactions = useTransactions(me?.uid, 30);
  const decayHistory = useDecayHistory(me?.uid, 12);
  const partner = useMemo(() => (me ? getPartner(me) : null), [me]);

  if (!me || !wallet) return null;
  const adminLocked = me.role === "admin";
  const cap = getMonthlyCapProgress(wallet);

  return (
    <div className="space-y-4">
      <WalletHero wallet={wallet} partnerName={partner ? <Link to="/dashboard/partner" className="font-semibold text-rose-700">{partner.displayName}</Link> : null} adminLocked={adminLocked} />
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-xs uppercase tracking-wide font-bold text-rose-400">Lifetime decayed</div><div className="font-display text-3xl font-extrabold text-orange-600 mt-1">{wallet.lifetimeDecayed}</div><div className="text-xs text-gray-500 mt-1">20% monthly rollover</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide font-bold text-rose-400">Cap remaining</div><div className="font-display text-3xl font-extrabold text-emerald-600 mt-1">{cap.remaining}</div><div className="text-xs text-gray-500 mt-1">Out of {cap.cap} monthly</div></Card>
      </div>
      {!adminLocked && <Card><CardHeader title="Demo controls" subtitle="Cloud Functions only in production" /><Button variant="outline" fullWidth onClick={() => { try { simulateMonthlyDecay(me.uid); } catch {} }}><RefreshCcw size={16} /> Simulate month</Button></Card>}
      {/* Partner wallet removed — partner balances are private */}
      <Card><CardHeader title="Transaction history" /><TransactionList transactions={transactions} /></Card>
      <Card><CardHeader title="Recent decay" /><TransactionList transactions={decayHistory} emptyLabel="No decay applied yet." /></Card>
      <Card><CardHeader title="Economy rules" /><ul className="space-y-2 text-sm text-gray-700"><li className="flex gap-2"><Zap size={14} className="text-emerald-600 shrink-0 mt-0.5" />Easy=20 · Medium=40 · Hard=60 points.</li><li className="flex gap-2"><Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />100-point monthly redemption cap.</li><li className="flex gap-2"><RefreshCcw size={14} className="text-orange-500 shrink-0 mt-0.5" />20% decay on rollover balance monthly.</li></ul></Card>
    </div>
  );
}
