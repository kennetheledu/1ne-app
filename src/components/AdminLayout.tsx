import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, BarChart3, ClipboardList, FileText, LogOut, ShieldCheck, Settings } from "lucide-react";
import { useAuth } from "../lib/auth";
import { cn } from "../utils/cn";

const tabs = [
  { to: "/dashboard/admin", label: "Overview", icon: Activity },
  { to: "/dashboard/admin/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/dashboard/admin/logs", label: "Logs", icon: FileText },
  { to: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/admin/system", label: "System", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50/60 text-slate-900 relative">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center shadow-soft">
              <ShieldCheck size={17} className="text-white" />
            </div>
            <div>
              <div className="font-display font-extrabold text-slate-900 leading-none">1ne Admin</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">system moderator</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 pb-24 relative z-0">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
        <div className="mx-3 mb-3 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-soft">
          <div className="grid grid-cols-5 h-16">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === "/dashboard/admin"}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-0.5 relative text-[10px] font-bold",
                      isActive ? "text-slate-900" : "text-slate-400"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="admin-nav"
                          className="absolute inset-1.5 rounded-2xl bg-slate-100"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon size={17} className="relative z-10" />
                      <span className="relative z-10">{tab.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}