import { Clock, Flame, TrendingUp, WalletCards } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { useMe } from "../../lib/useMe";
import { getAdminAnalytics } from "../../lib/firebase";

export function AdminAnalytics() {
  const me = useMe();
  if (!me) return null;
  const data = getAdminAnalytics(me.uid);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={<Flame size={17} />} label="Avg streak" value={data.averageStreak} />
        <Metric icon={<Clock size={17} />} label="Pending" value={data.pendingApprovals} />
        <Metric icon={<TrendingUp size={17} />} label="Daily users" value={data.dailyActiveUsers} />
        <Metric icon={<WalletCards size={17} />} label="Redeemed" value={data.redemptionTotal} />
      </div>
      <Card className="bg-white border-slate-200">
        <CardHeader title="Most completed tasks" subtitle="Top completion patterns" />
        <div className="space-y-2">
          {data.mostCompletedTasks.length === 0 ? <div className="text-sm text-slate-400 py-6 text-center">No task completion data yet.</div> : data.mostCompletedTasks.map(([title, count]) => (
            <div key={title} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <div className="font-bold text-sm text-slate-800 truncate">{title}</div>
              <div className="text-xs font-extrabold text-slate-500">{count}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="text-slate-500">{icon}</div>
      <div className="font-display text-3xl font-extrabold text-slate-900 mt-2">{value}</div>
      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-1">{label}</div>
    </Card>
  );
}