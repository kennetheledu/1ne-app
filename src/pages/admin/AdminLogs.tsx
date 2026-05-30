import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { getAuditLogs, getUser } from "../../lib/firebase";
import type { AuditLogDoc, UserDoc } from "../../lib/firebaseTypes";

export function AdminLogs() {
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getAuditLogs(80);
        setLogs(data);
      } catch (err) {
        console.error("[AdminLogs] Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200">
        <CardHeader title="Immutable logs" subtitle="Approvals, rejections, transactions, reveals, and moderation" />
        <div className="space-y-2">
          {logs.map((log) => <LogEntry key={log.id} log={log} />)}
        </div>
      </Card>
    </div>
  );
}

function LogEntry({ log }: { log: AuditLogDoc }) {
  const [actor, setActor] = useState<UserDoc | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUser(log.actor);
        setActor(data);
      } catch (err) {
        console.error("[AdminLogs] Error fetching actor:", err);
      }
    }
    fetch();
  }, [log.actor]);

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
        <FileText size={15} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-bold text-slate-800">{log.action}</div>
        <div className="text-[11px] text-slate-500 truncate">
          by {actor?.displayName ?? log.actor} · {
            (log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt))
              .toLocaleDateString()
          }
        </div>
      </div>
    </div>
  );
}