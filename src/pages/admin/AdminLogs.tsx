import { FileText } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { getAuditLogs, getUser } from "../../lib/firebase";

export function AdminLogs() {
  const logs = getAuditLogs(80);
  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200">
        <CardHeader title="Immutable logs" subtitle="Approvals, rejections, transactions, reveals, and moderation" />
        <div className="space-y-2">
          {logs.map((log) => {
            const actor = getUser(log.actor);
            return (
              <div key={log.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-bold text-slate-800">{log.action}</div>
                  <div className="text-[11px] text-slate-500 truncate">by {actor?.displayName ?? log.actor} · {new Date(log.createdAt).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}