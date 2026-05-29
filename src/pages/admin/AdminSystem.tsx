import { Bell, CheckCircle2, Cloud, Cpu, Smartphone } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useMe } from "../../lib/useMe";
import { getSystemHealth } from "../../lib/firebase";

export function AdminSystem() {
  const me = useMe();
  if (!me) return null;
  const health = getSystemHealth(me.uid);
  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200">
        <CardHeader title="System status" subtitle="Operational checks" />
        <div className="space-y-2">
          <Row icon={<Cloud size={16} />} label="Firebase" value={health.firebase} />
          <Row icon={<Cpu size={16} />} label="Cloud Functions" value={health.cloudFunctions} />
          <Row icon={<Smartphone size={16} />} label="PWA" value={health.pwa} />
          <Row icon={<Bell size={16} />} label="Notifications" value={health.notifications} />
        </div>
      </Card>
      <Card className="bg-white border-slate-200">
        <CardHeader title="Notification testing" subtitle="Safe simulated test" />
        <Button fullWidth variant="secondary" onClick={() => alert("Notification test simulated")}>Send test notification</Button>
      </Card>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">{icon}{label}</div>
      <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1"><CheckCircle2 size={12} />{value}</div>
    </div>
  );
}