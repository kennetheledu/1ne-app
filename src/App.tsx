import { useEffect, useState, type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { AuthProvider, useAuth } from "./lib/auth";
import { Onboarding } from "./pages/Onboarding";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Wallet } from "./pages/Wallet";
import { Tasks } from "./pages/Tasks";
import { Threads } from "./pages/Threads";
import { Favors } from "./pages/Favors";
import { Partner } from "./pages/Partner";
import { Profile } from "./pages/Profile";
import { Security } from "./pages/Security";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminTasks } from "./pages/admin/AdminTasks";
import { AdminLogs } from "./pages/admin/AdminLogs";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminSystem } from "./pages/admin/AdminSystem";
import { getMe, auth } from "./lib/firebase";
import type { UserDoc } from "./lib/firebaseTypes";

const ONBOARD_KEY = "1ne.onboarded.v1";

function useOnboardingDone() {
  const [done, setDone] = useState<boolean>(() => { try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return false; } });
  return [done, () => { localStorage.setItem(ONBOARD_KEY, "1"); setDone(true); }] as const;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function UserOnly({ children }: { children: ReactNode }) {
  return (
    <Protected>
      <RoleGate role="user">{children}</RoleGate>
    </Protected>
  );
}

function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <Protected>
      <RoleGate role="admin">{children}</RoleGate>
    </Protected>
  );
}

function RoleGate({ role, children }: { role: "user" | "admin"; children: ReactNode }) {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const data = await getMe();
          setMe(data);
        } catch (err) {
          console.error("[RoleGate] Profile fetch error:", err);
          setMe(null);
        }
      } else {
        setMe(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" /></div>;
  if (!me) return <Navigate to="/auth" replace />;
  if (role === "admin" && me.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (role === "user" && me.role === "admin") return <Navigate to="/dashboard/admin" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [onboarded, finish] = useOnboardingDone();
  const location = useLocation();
  const [me, setMe] = useState<UserDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const data = await getMe();
          setMe(data);
        } catch (err) {
          console.error("[AppRoutes] Error fetching profile:", err);
          setMe(null);
        }
      } else {
        setMe(null);
      }
      setProfileLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading || profileLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" /></div>;
  if (!user && !onboarded && location.pathname === "/") return <Onboarding onFinish={finish} />;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={me?.role === "admin" ? "/dashboard/admin" : "/dashboard"} replace /> : <Auth />} />
      <Route path="/" element={<Navigate to={user ? (me?.role === "admin" ? "/dashboard/admin" : "/dashboard") : "/auth"} replace />} />

      <Route path="/dashboard" element={<UserOnly><Layout><Dashboard /></Layout></UserOnly>} />
      <Route path="/dashboard/tasks" element={<UserOnly><Layout><Tasks /></Layout></UserOnly>} />
      <Route path="/dashboard/wallet" element={<UserOnly><Layout><Wallet /></Layout></UserOnly>} />
      <Route path="/dashboard/threads" element={<UserOnly><Layout><Threads /></Layout></UserOnly>} />
      <Route path="/dashboard/favors" element={<UserOnly><Layout><Favors /></Layout></UserOnly>} />
      <Route path="/dashboard/profile" element={<UserOnly><Layout><Profile /></Layout></UserOnly>} />
      <Route path="/dashboard/partner" element={<UserOnly><Layout><Partner /></Layout></UserOnly>} />
      <Route path="/dashboard/security" element={<UserOnly><Layout><Security /></Layout></UserOnly>} />

      <Route path="/home" element={<Protected><Layout><Dashboard /></Layout></Protected>} />

      <Route path="/dashboard/admin" element={<AdminOnly><AdminLayout><AdminOverview /></AdminLayout></AdminOnly>} />
      <Route path="/dashboard/admin/tasks" element={<AdminOnly><AdminLayout><AdminTasks /></AdminLayout></AdminOnly>} />
      <Route path="/dashboard/admin/logs" element={<AdminOnly><AdminLayout><AdminLogs /></AdminLayout></AdminOnly>} />
      <Route path="/dashboard/admin/analytics" element={<AdminOnly><AdminLayout><AdminAnalytics /></AdminLayout></AdminOnly>} />
      <Route path="/dashboard/admin/system" element={<AdminOnly><AdminLayout><AdminSystem /></AdminLayout></AdminOnly>} />

      <Route path="/tasks" element={<Navigate to="/dashboard/tasks" replace />} />
      <Route path="/wallet" element={<Navigate to="/dashboard/wallet" replace />} />
      <Route path="/partner" element={<Navigate to="/dashboard/partner" replace />} />
      <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
      <Route path="/security" element={<Navigate to="/dashboard/security" replace />} />
      <Route path="*" element={<Navigate to={user ? (me?.role === "admin" ? "/dashboard/admin" : "/dashboard") : "/auth"} replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => { document.documentElement.classList.add("scrollbar-none"); }, []);
  return <AuthProvider><HashRouter><AppRoutes /></HashRouter></AuthProvider>;
}
