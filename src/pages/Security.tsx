import { useEffect, useState } from "react";
import { Card, CardHeader } from "../components/ui/Card";
import { Shield, History, Lock, Zap, ClipboardCheck } from "lucide-react";
import { CLOUD_FUNCTIONS_OVERVIEW, FIRESTORE_RULES, FIRESTORE_SCHEMA, getAuditLogs, getUser } from "../lib/firebase";
import { useMe } from "../lib/useMe";
import type { AuditLogDoc, UserDoc } from "../lib/firebaseTypes";

export function Security() {
  const me = useMe();
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await getAuditLogs(20);
        setLogs(data);
      } catch (err) {
        console.error("[Security] Failed to fetch logs:", err);
        alert("Failed to load security logs.");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (!me || loading) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Security model" subtitle="How 1ne protects the point economy" />
        <ul className="space-y-3 text-sm">
          <B icon={<Lock size={14} className="text-rose-500" />} title="Cloud Functions only" body="All point awards, deductions, and approvals run through server-side Cloud Functions. Clients never write wallet data." />
          <B icon={<Shield size={14} className="text-orange-500" />} title="Partner-only approval" body="Tasks must be approved by the linked partner. No self-approval. Admins cannot bypass the approval system." />
          <B icon={<ClipboardCheck size={14} className="text-violet-500" />} title="Immutable audit logs" body="Every approval, rejection, counter, and point mutation is permanently logged." />
          <B icon={<Zap size={14} className="text-emerald-500" />} title="Admin guardrails" body="Admins can create tasks but cannot award points, self-approve, or manipulate wallets." />
        </ul>
      </Card>
      <Card>
        <CardHeader title="Cloud Functions" />
        <div className="space-y-2">{CLOUD_FUNCTIONS_OVERVIEW.map(fn => <div key={fn} className="rounded-2xl bg-mint-50 border border-mint-100 p-3 font-mono text-sm font-bold text-emerald-700">{fn}</div>)}</div>
      </Card>
      <Card>
        <CardHeader title="Firestore collections" />
        <div className="space-y-2">{Object.entries(FIRESTORE_SCHEMA).map(([name, fields]) => <div key={name} className="rounded-2xl bg-lavender-50 border border-lavender-100 p-3"><div className="font-mono text-sm font-bold text-violet-700">/{name}</div><div className="text-[11px] text-gray-600 mt-1 font-mono break-words">{(fields as readonly string[]).join(", ")}</div></div>)}</div>
      </Card>
      <Card>
        <CardHeader title="Audit log" subtitle={`${logs.length} recent events`} />
        {logs.length === 0 ? <div className="text-center py-6 text-sm text-gray-400"><History className="mx-auto mb-2 opacity-40" size={22} />No activity.</div> : <ul className="space-y-2">{logs.map(log => <LogItem key={log.id} log={log} />)}</ul>}
      </Card>
      <Card><CardHeader title="Firestore rules" /><pre className="text-[11px] bg-slate-900 text-emerald-200 rounded-2xl p-4 overflow-x-auto whitespace-pre font-mono leading-relaxed">{FIRESTORE_RULES}</pre></Card>
    </div>
  );
}

function LogItem({ log }: { log: AuditLogDoc }) {
  const [actor, setActor] = useState<UserDoc | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUser(log.actor);
        setActor(data);
      } catch (err) {
        console.error("[Security] Error fetching actor:", err);
      }
    }
    fetch();
  }, [log.actor]);

  return (
    <li className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
        <History size={14} className="text-rose-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-rose-700 font-mono">{log.action}</div>
        <div className="text-[11px] text-gray-500 truncate">by {actor?.displayName ?? log.actor}</div>
      </div>
      <div className="text-[10px] text-gray-400 font-semibold shrink-0">
        {
          (log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt))
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      </div>
    </li>
  );
}

function B({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <li className="flex gap-3"><div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">{icon}</div><div><div className="font-bold text-rose-700 text-sm">{title}</div><div className="text-gray-600 text-xs mt-0.5">{body}</div></div></li>;
}
