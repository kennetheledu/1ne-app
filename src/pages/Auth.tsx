import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../lib/auth";
import { Toast } from "../components/ui/Toast";

export function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; msg: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setToast({ kind: "error", msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {toast && <Toast kind={toast.kind} message={toast.msg} onClose={() => setToast(null)} />}

      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="absolute top-1/3 -left-24 w-96 h-96 rounded-full bg-lavender-200/50 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-mint-200/50 blur-3xl" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] gradient-rose shadow-cute mb-4"
          >
            <Heart className="text-white" size={36} fill="white" />
          </motion.div>
          <h1 className="font-display text-4xl font-extrabold text-rose-600 tracking-tight">
            1ne
          </h1>
          <p className="text-rose-400 text-sm mt-1 font-semibold">
            rewards for two 💞
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-soft p-6"
        >
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-rose-50 mb-5">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${
                  mode === m
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-rose-400 hover:text-rose-500"
                }`}
              >
                {m === "signup" ? "Join 1ne" : "Sign in"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Input
                name="name"
                placeholder="Your cute name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="pl-12"
                label=""
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23fda4af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "1rem center",
                }}
              />
            )}
            <Input
              name="email"
              type="email"
              placeholder="you@email.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="pl-12"
              label=""
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23fda4af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='20' height='16' x='2' y='4' rx='2'%3E%3C/rect%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "1rem center",
              }}
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="pl-12"
              label=""
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23fda4af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "1rem center",
              }}
            />

            {error && (
              <div className="text-sm text-rose-500 font-semibold bg-rose-50 rounded-2xl px-4 py-2.5 border border-rose-100">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={busy} className="mt-2">
              {busy
                ? "Hold on…"
                : mode === "signup"
                ? "Create my account"
                : "Sign in"}
              {!busy && <ArrowRight size={18} />}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-rose-100 text-center text-xs text-gray-500">
            <Sparkles size={12} className="inline mr-1 text-rose-400" />
            Admins use <span className="font-semibold text-rose-500">@1ne.app</span> email
            <br />
            Admins cannot modify points or approvals.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
