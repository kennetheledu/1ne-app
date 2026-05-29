import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Shield, Sparkles } from "lucide-react";
import type { Role } from "../lib/firebase";

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  const isAdmin = role === "admin";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
        isAdmin
          ? "bg-gradient-to-r from-amber-200 to-orange-300 text-orange-700 border border-orange-200"
          : "bg-rose-100 text-rose-600 border border-rose-200",
        className
      )}
      title={
        isAdmin
          ? "Admin — visible role. Admins cannot modify points or approvals."
          : "Member"
      }
    >
      {isAdmin ? <Shield size={12} /> : <Sparkles size={12} />}
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

export function RoleBanner({ role }: { role: Role }) {
  if (role !== "admin") return null;
  return (
    <div className="rounded-2xl p-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200 text-orange-800 text-xs font-semibold flex items-start gap-2">
      <Shield size={14} className="shrink-0 mt-0.5" />
      <div>
        <div>Visible Admin Account</div>
        <div className="font-normal text-orange-700/80 mt-0.5">
          Admins cannot modify points or approvals. Permissions are enforced
          server-side via Firestore rules.
        </div>
      </div>
    </div>
  );
}

export function PermissionNote({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
      <Shield size={10} /> {children}
    </div>
  );
}
