import { motion } from "framer-motion";
import { User, Mail, Calendar, Key, Shield, Sparkles } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import { RoleBadge, RoleBanner } from "../components/RoleBadge";
import { useMe } from "../lib/useMe";

export function Profile() {
  const me = useMe();
  if (!me) return null;

  return (
    <div className="space-y-4">
      {/* Avatar card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-[28px] gradient-peach p-6 shadow-soft border border-white/80 text-center relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/40 blur-2xl" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-[24px] bg-white flex items-center justify-center font-display font-extrabold text-3xl text-rose-600 shadow-cute">
            {me.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="font-display text-2xl font-extrabold text-rose-700 mt-3">
            {me.displayName}
          </div>
          <div className="text-sm text-rose-500/80 mt-0.5">{me.email}</div>
          <div className="mt-3 flex justify-center">
            <RoleBadge role={me.role} />
          </div>
        </div>
      </motion.div>

      <RoleBanner role={me.role} />

      <Card>
        <CardHeader title="Account" subtitle="Your profile details" />
        <div className="space-y-1">
          <Row icon={<User size={14} />} label="Display name" value={me.displayName} />
          <Row icon={<Mail size={14} />} label="Email" value={me.email} />
          <Row icon={<Key size={14} />} label="User ID" value={me.uid} mono />
          <Row
            icon={<Calendar size={14} />}
            label="Joined"
            value={new Date(me.createdAt).toLocaleString()}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Permissions" subtitle="What you can do in the live point economy" />
        <ul className="space-y-2">
          <PermissionRow ok text="Generate & share your invite code" />
          <PermissionRow ok text="Link with a partner via their invite code" />
          <PermissionRow ok text="View your linked partner's profile" />
          <PermissionRow ok text="Trigger wallet actions through Cloud Functions" />
          <PermissionRow ok text="Receive partner and wallet notifications" />
          <PermissionRow
            ok={me.role !== "admin"}
            text={
              me.role === "admin"
                ? "Award, redeem, or manually adjust points (locked for admins)"
                : "Directly edit balances from the client (blocked — Cloud Functions only)"
            }
          />
        </ul>
      </Card>

      <Card>
        <CardHeader title="Roles" subtitle="Publicly visible across the app" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <Sparkles size={16} className="text-rose-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-rose-700">Member</div>
              <div className="text-xs text-gray-500">
                Standard role. Can link partners and participate in rewards.
              </div>
            </div>
            <RoleBadge role="user" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield size={16} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-orange-700">Admin</div>
              <div className="text-xs text-gray-500">
                Visible badge. <b>Cannot</b> modify points or approvals.
              </div>
            </div>
            <RoleBadge role="admin" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-rose-100 last:border-b-0 gap-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold uppercase tracking-wide shrink-0">
        <span className="text-rose-400">{icon}</span>
        {label}
      </div>
      <div
        className={`text-sm text-rose-700 font-bold truncate text-right ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PermissionRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
          ok
            ? "bg-mint-200 text-emerald-700"
            : "bg-amber-100 text-orange-700"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      <span className="text-gray-700">{text}</span>
    </li>
  );
}
