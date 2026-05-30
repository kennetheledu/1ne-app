import { useEffect, useState } from "react";
import { Activity, ClipboardList, Flame, Link2, Users, WalletCards } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { useMe } from "../../lib/useMe";
import { getAdminStats, getAuditLogs, getUser } from "../../lib/firebase";
import type { AuditLogDoc, UserDoc } from "../../lib/firebaseTypes";

export function AdminOverview() {
  const me = useMe();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    async function load() {
      try {
        const [s, l] = await Promise.all([
          getAdminStats(),
          getAuditLogs(6)
        ]);
        setStats(s);
        setLogs(l);
      } catch (err) {
        console.error("[AdminOverview] Data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [me]);

  if (!me || loading || !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 shadow-cute animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] bg-slate-900 text-white p-5 shadow-soft">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-300">Admin overview</div>
        <div className="font-display text-3xl font-extrabold mt-1">System health</div>
        <p className="text-sm text-slate-300 mt-1">Moderate tasks, monitor activity, and keep relationship systems safe.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Users size={17} />} label="Total Members" value={stats ? stats.totalUsers : "—"} />
        <Stat icon={<ClipboardList size={17} />} label="Active Tasks" value={stats ? stats.totalTasks : "—"} />
        <Stat icon={<Activity size={17} />} label="Pending Favors" value={stats ? stats.totalFavorRequests : "—"} />
        <Stat icon={<Activity size={17} />} label="System Health" value="Healthy ✓" />
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader title="Recent activity" subtitle="Immutable audit stream" />
        <div className="space-y-2">
          {logs.map((log) => <RecentLogItem key={log.id} log={log} />)}
        </div>
      </Card>
    </div>
  );
}

function RecentLogItem({ log }: { log: AuditLogDoc }) {
  const [actor, setActor] = useState<UserDoc | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUser(log.actor);
        setActor(data);
      } catch (err) {
        console.error("[AdminOverview] Error fetching actor info:", err);
      }
    }
    fetch();
  }, [log.actor]);

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
      <div className="text-xs font-mono font-bold text-slate-700">{log.action}</div>
      <div className="text-[11px] text-slate-500 mt-1">by {actor?.displayName ?? log.actor}</div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="text-slate-500">{icon}</div>
      <div className="font-display text-3xl font-extrabold text-slate-900 mt-2">{value ?? "—"}</div>
      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-1">{label}</div>
    </Card>
  );
}