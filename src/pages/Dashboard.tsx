import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Copy, Check, Bell, Sparkles, Users, Coins, Flame, Gift, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { RoleBanner } from "../components/RoleBadge";
import { CapProgress } from "../components/wallet/CapProgress";
import { useMe } from "../lib/useMe";
import { useActiveTasks, usePendingApprovals, useStreak } from "../lib/useTasks";
import { useWallet } from "../lib/useWallet";
import { useNotifications } from "../lib/useNotifications";
import { getMonthlyCapProgress, getPartner, markNotificationRead } from "../lib/firebase";
import { cn } from "../utils/cn";

export function Dashboard() {
  const me = useMe();
  const wallet = useWallet(me?.uid);
  const active = useActiveTasks(me?.uid);
  const pending = usePendingApprovals(me?.uid);
  const streak = useStreak(me?.uid);
  const partner = useMemo(() => (me ? getPartner(me) : null), [me]);
  const notifications = useNotifications(me?.uid);
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!me || !wallet) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" />
      </div>
    );
  }
  const cap = getMonthlyCapProgress(wallet);

  return (
    <div className="space-y-4">
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[28px] gradient-pastel p-5 shadow-soft border border-white/80 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
        <div className="relative">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1">Welcome back</div>
          <div className="font-display text-3xl font-extrabold text-rose-700">{me.displayName.split(" ")[0]} 💗</div>
          <p className="text-rose-500/90 text-sm mt-1">{partner ? `You and ${partner.displayName} are earning together.` : "Link your partner to start."}</p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link to="/dashboard/tasks"><Button size="sm"><Sparkles size={14} /> Tasks</Button></Link>
            <Link to="/dashboard/wallet"><Button size="sm" variant="secondary"><Coins size={14} /> Wallet</Button></Link>
          </div>
        </div>
      </motion.div>
      {me.role === "admin" && <RoleBanner role={me.role} />}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Coins className="text-amber-500" size={18} />} label="Balance" value={wallet?.totalPoints ?? 0} tone="amber" />
        <Stat icon={<Gift className="text-pink-500" size={18} />} label="Cap left" value={`${cap.used}/10 used · ${cap.remaining} left`} tone="pink" />
        <Stat icon={<Flame className="text-violet-500" size={18} />} label="Streak" value={streak?.current ?? 0} tone="violet" />
      </div>
      <Card><CardHeader title="This month" subtitle={`${partner?.displayName || "Your partner"} · redemption progress`} /><CapProgress used={wallet.monthlyRedeemed} cap={10} /></Card>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/dashboard/tasks" className="block"><Card className="p-4 hover:shadow-cute transition-shadow"><div className="flex items-center gap-2 mb-2"><ClipboardCheck size={16} className="text-rose-500" /><span className="text-xs font-bold text-rose-600 uppercase">Active</span></div><div className="font-display text-2xl font-extrabold text-rose-700">{active.length}</div><div className="text-[11px] text-gray-500">tasks</div></Card></Link>
        <Link to="/dashboard/tasks" className="block"><Card className="p-4 hover:shadow-cute transition-shadow"><div className="flex items-center gap-2 mb-2"><Check size={16} className="text-violet-500" /><span className="text-xs font-bold text-violet-600 uppercase">Reviews</span></div><div className="font-display text-2xl font-extrabold text-rose-700">{pending.length}</div><div className="text-[11px] text-gray-500">pending</div></Card></Link>
      </div>
      {!partner && <InviteCode code={me.inviteCode ?? ""} />}
      {partner ? (
        <Link to="/dashboard/partner" className="block">
          <Card>
            <CardHeader title="Your partner 💞" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-peach flex items-center justify-center font-display font-extrabold text-rose-700 text-lg">{partner.displayName.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-rose-700 truncate">{partner.displayName}</div>
                <div className="text-xs text-gray-500 truncate">Partner linked</div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-mint-100 text-emerald-700 text-xs font-bold">Linked</div>
            </div>
          </Card>
        </Link>
      ) : (
        <Card className="border-dashed border-2 border-rose-200 bg-rose-50/50"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center"><Users className="text-rose-400" size={22} /></div><div className="flex-1"><div className="font-display font-bold text-rose-600">Not linked yet</div><div className="text-xs text-gray-500">Share your invite code.</div></div><Link to="/dashboard/partner"><Button size="sm">Link</Button></Link></div></Card>
      )}
      <Card>
        <CardHeader title="Notifications" subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up ✨"} action={unreadCount > 0 && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />} />
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400"><Bell className="mx-auto mb-2 opacity-40" size={24} />Nothing here yet.</div>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-2">
              {notifications.slice(0, 4).map(n => (
                <li key={n.id} className={cn("flex items-start gap-3 p-3 rounded-2xl border cursor-pointer", n.read ? "bg-white/40 border-transparent" : "bg-rose-50 border-rose-100")} onClick={() => markNotificationRead(n.id)}>
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0"><Sparkles size={16} className="text-violet-500" /></div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-bold text-rose-700">{n.title}</div><div className="text-xs text-gray-500 truncate">{n.body}</div></div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />}
                </li>
              ))}
            </ul>
            {notifications.length > 4 && (
              <div className="max-h-52 overflow-y-auto space-y-2 mt-2 pr-2 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-white/0">
                {notifications.slice(4).map(n => (
                  <div key={n.id} className={cn("flex items-start gap-3 p-3 rounded-2xl border cursor-pointer", n.read ? "bg-white/40 border-transparent" : "bg-rose-50 border-rose-100")} onClick={() => markNotificationRead(n.id)}>
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0"><Sparkles size={16} className="text-violet-500" /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm font-bold text-rose-700">{n.title}</div><div className="text-xs text-gray-500 truncate">{n.body}</div></div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "amber" | "pink" | "violet" }) {
  const t = { amber: "from-amber-100 to-peach-100 text-amber-700", pink: "from-pink-100 to-rose-100 text-rose-700", violet: "from-lavender-100 to-lavender-200 text-violet-700" }[tone];
  return <div className={`rounded-2xl bg-gradient-to-br ${t} p-3 border border-white shadow-sm`}><div className="flex items-center justify-between mb-1">{icon}</div><div className="font-display font-extrabold text-xl leading-none">{value}</div><div className="text-[11px] font-bold uppercase tracking-wide mt-1 opacity-80">{label}</div></div>;
}
function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return <Card><CardHeader title="Invite code" subtitle="Share with partner" /><div className="flex items-center gap-3"><div className="flex-1 flex items-center justify-center py-3 rounded-2xl gradient-mint border border-white shadow-inner"><span className="font-display font-extrabold text-2xl tracking-[0.3em] text-emerald-700">{code}</span></div><Button size="md" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied!" : "Copy"}</Button></div></Card>;
}
