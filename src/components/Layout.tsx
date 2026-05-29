import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Heart, User, LogOut, WalletCards, Sparkles, Gift } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useMe } from "../lib/useMe";
import { usePendingApprovals } from "../lib/useTasks";
import { RoleBadge } from "./RoleBadge";
import { cn } from "../utils/cn";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/dashboard/tasks", label: "Tasks", icon: Sparkles },
  { to: "/dashboard/favors", label: "Favors", icon: Gift },
  { to: "/dashboard/wallet", label: "Wallet", icon: WalletCards },
  { to: "/dashboard/threads", label: "Threads", icon: Heart },
];

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const me = useMe();
  const nav = useNavigate();
  const pending = usePendingApprovals(me?.uid);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-30 glass border-b border-white/80">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl gradient-rose shadow-cute flex items-center justify-center">
              <Heart size={16} className="text-white" fill="white" />
            </div>
            <div>
              <div className="font-display font-extrabold text-rose-600 leading-none">1ne</div>
              <div className="text-[10px] text-rose-400 font-semibold leading-none mt-0.5">for two 💞</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {me && <RoleBadge role={me.role} />}
            <button onClick={async () => { await signOut(); nav("/"); }} className="w-9 h-9 rounded-xl bg-white/80 border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-50" aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-24 relative z-0">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
        <div className="mx-3 mb-3 rounded-3xl glass border border-white/80 shadow-soft">
          <div className="grid grid-cols-5 h-16">
            {tabs.map(t => {
              const Icon = t.icon;
              const badge = t.to === "/dashboard/tasks" && pending.length > 0;
              return (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => cn("flex flex-col items-center justify-center gap-0.5 relative text-[11px] font-bold", isActive ? "text-rose-600" : "text-gray-400")}>
                  {({ isActive }) => (<>
                    {isActive && <motion.div layoutId="navpill" className="absolute inset-1.5 rounded-2xl bg-rose-100/80" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                    <div className="relative z-10"><Icon size={18} />{badge && <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />}</div>
                    <span className="relative z-10 text-[10px]">{t.label}</span>
                  </>)}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
