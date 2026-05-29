import { motion } from "framer-motion";
import { Coins, Flame, HeartHandshake, Shield } from "lucide-react";
import type { WalletDoc } from "../../lib/firebase";
import { CapProgress } from "./CapProgress";

export function WalletHero({
  wallet,
  partnerName,
  adminLocked,
}: {
  wallet: WalletDoc;
  partnerName?: React.ReactNode | string | null;
  adminLocked?: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-[30px] gradient-pastel p-5 shadow-soft border border-white/80 relative overflow-hidden"
    >
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/35 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/30 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-rose-600">
              Your wallet
            </div>
            <div className="font-display text-4xl font-extrabold text-rose-700 leading-none mt-1">
              {wallet.balance}
            </div>
            <div className="text-sm text-rose-500/90 mt-1">
              Spendable points
              {partnerName ? <span> · linked with {partnerName}</span> : " · personal wallet"}
            </div>
          </div>
          <div className="w-14 h-14 rounded-[22px] bg-white/80 flex items-center justify-center shadow-cute">
            <Coins className="text-amber-500" size={26} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat
            icon={<HeartHandshake size={16} className="text-emerald-600" />}
            label="Lifetime"
            value={wallet.lifetimeEarned}
            tone="mint"
          />
          <MiniStat
            icon={<Flame size={16} className="text-orange-500" />}
            label="Streak"
            value={wallet.currentStreak}
            tone="peach"
          />
          <MiniStat
            icon={<Coins size={16} className="text-pink-500" />}
            label="Redeemed"
            value={wallet.lifetimeRedeemed}
            tone="rose"
          />
        </div>

        <CapProgress used={wallet.monthlyRedeemed} cap={wallet.monthlyCap} />

        {adminLocked && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-orange-800 font-semibold flex items-start gap-2">
            <Shield size={14} className="shrink-0 mt-0.5" />
            Admin wallets are read-only. Admins cannot award, redeem, or manually adjust points.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "mint" | "peach" | "rose";
}) {
  const tones = {
    mint: "from-mint-100 to-emerald-50 text-emerald-700",
    peach: "from-peach-100 to-amber-50 text-orange-700",
    rose: "from-rose-100 to-pink-50 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones} border border-white p-3`}>
      <div className="flex items-center justify-between">{icon}</div>
      <div className="font-display font-extrabold text-xl mt-2 leading-none">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide mt-1 opacity-80">
        {label}
      </div>
    </div>
  );
}
