import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Copy, Check, RefreshCcw, Link as LinkIcon, Unlink, Gift, Flame, Trophy } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Toast } from "../components/ui/Toast";
import { useMe } from "../lib/useMe";
import {
  linkPartner,
  unlinkPartner,
  regenerateInviteCode,
  getPartner,
  getStreak,
  getUser,
} from "../lib/firebase";

export function Partner() {
  const me = useMe();
  const [partner, setPartner] = useState<any>(null);
  const partnerStreak = partner ? getStreak(partner.uid) : null;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (me?.partnerId) {
      getUser(me.partnerId).then(setPartner).catch(console.error);
    }
  }, [me?.partnerId]);

  if (!me) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" />
      </div>
    );
  }

  async function onLink() {
    if (!code.trim() || !me) return;
    setBusy(true);
    try {
      const { relationshipId } = await linkPartner(me.uid, code);
      window.dispatchEvent(new Event("1ne:db-changed"));
      setToast({ kind: "success", msg: "Linked successfully! 💞" });
      setCode("");
    } catch (err) {
      setToast({
        kind: "error",
        msg: err instanceof Error ? err.message : "Could not link",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate() {
    if (!confirm("Regenerate your invite code? Your old code will stop working.")) return;
    if (!me) return;
    try {
      await regenerateInviteCode(me.uid);
      window.dispatchEvent(new Event("1ne:db-changed"));
      setToast({ kind: "success", msg: "New invite code generated" });
    } catch (err) {
      console.error("[Partner] Regenerate Error:", err);
      setToast({
        kind: "error",
        msg: err instanceof Error ? err.message : "Failed to regenerate code",
      });
    }
  }

  async function onUnlink() {
    if (!confirm("Unlink from your partner? You can re-link anytime with a new code.")) return;
    if (!me) return;
    try {
      await unlinkPartner(me.uid);
      window.dispatchEvent(new Event("1ne:db-changed"));
      setToast({ kind: "info", msg: "Unlinked" });
    } catch (err) {
      console.error("[Partner] Unlink Error:", err);
      setToast({
        kind: "error",
        msg: "Failed to unlink partner",
      });
    }
  }

  async function copyCode() {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.inviteCode ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // Admin note: admins can't modify partner points/approvals (not part of Phase 1 data model,
  // but we surface the permission note clearly).
  const adminLocked = me.role === "admin";

  return (
    <div className="space-y-4">
      {toast && <Toast kind={toast.kind} message={toast.msg} onClose={() => setToast(null)} />}

      <AnimatePresence mode="wait">
        {partner ? (
          <motion.div
            key="linked"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="space-y-4"
          >
            {/* Partner celebration card */}
            <div className="rounded-[28px] gradient-rose p-6 text-white shadow-cute relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-5xl mb-2"
              >
                💞
              </motion.div>
              <div className="font-display text-2xl font-extrabold">
                You and {partner?.displayName || partner?.nickname || "Your partner"}
              </div>
              <div className="text-white/90 text-sm mt-1">
                are officially 1ne!
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar name={me.displayName} />
                <div className="flex-1 flex items-center justify-center">
                  <Heart size={22} fill="white" className="text-white" />
                </div>
                <Avatar name={partner?.displayName || partner?.nickname || "Your partner"} />
              </div>
            </div>

            <Card>
              <CardHeader
                title="Partner details"
                subtitle="What's shared between you two"
              />
              <div className="space-y-2.5">
                <InfoRow label="Name" value={partner?.displayName || partner?.nickname || "Your partner"} />
                <InfoRow label="Email" value={partner.email} />
                <InfoRow label="Role" value={partner.role === "admin" ? "Admin" : "Member"} />
                <InfoRow
                  label="Joined"
                  value={
                    partner?.createdAt 
                      ? (partner.createdAt.toDate ? partner.createdAt.toDate() : new Date(partner.createdAt)).toLocaleDateString()
                      : "—"
                  }
                />
              </div>
              {adminLocked && (
                <p className="text-[11px] text-orange-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 font-semibold flex gap-2">
                  <Gift size={12} className="shrink-0 mt-0.5" />
                  Admins cannot modify points or approvals for any partner.
                </p>
              )}
            </Card>

            {partnerStreak && (
              <Card>
                <CardHeader
                  title="Streak stats"
                  subtitle="Current & best performance"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-orange-100 to-red-100 p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame size={16} className="text-orange-600" />
                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Current</span>
                    </div>
                    <div className="font-display text-3xl font-extrabold text-orange-700">
                      {partnerStreak.current}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">day streak</div>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={16} className="text-amber-600" />
                      <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Best</span>
                    </div>
                    <div className="font-display text-3xl font-extrabold text-amber-700">
                      {partnerStreak.best}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">max streak</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 border-t border-rose-100 pt-3">
                  <div>Completed <span className="font-semibold text-rose-700">{partnerStreak.totalCompletions}</span> tasks total</div>
                  {partnerStreak.lastCompletionDay && (
                    <div className="text-xs text-gray-500 mt-1">Last completed on {new Date(partnerStreak.lastCompletionDay).toLocaleDateString()}</div>
                  )}
                </div>
              </Card>
            )}

            <Button variant="danger" fullWidth size="md" onClick={onUnlink}>
              <Unlink size={16} /> Unlink partner
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="unlinked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="rounded-[28px] gradient-pastel p-5 text-center shadow-soft border border-white/80">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-2"
              >
                💌
              </motion.div>
              <div className="font-display text-2xl font-extrabold text-rose-700">
                Find your 1ne
              </div>
              <p className="text-rose-500/90 text-sm mt-1">
                Share your code, or enter theirs.
              </p>
            </div>

            <Card>
              <CardHeader title="Your invite code" subtitle="Share with your partner" />
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center py-3 rounded-2xl gradient-mint border border-white">
                  <span className="font-display font-extrabold text-2xl tracking-[0.3em] text-emerald-700">
                    {me.inviteCode}
                  </span>
                </div>
                <Button size="md" variant="secondary" onClick={copyCode}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
                <Button
                  size="md"
                  variant="outline"
                  onClick={onRegenerate}
                  title="Regenerate"
                >
                  <RefreshCcw size={16} />
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Enter their code"
                subtitle="6 characters, case-insensitive"
              />
              <Input
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-display text-center tracking-[0.3em] text-lg"
              />
              <Button
                fullWidth
                size="lg"
                className="mt-3"
                onClick={onLink}
                disabled={busy || code.length !== 6}
              >
                <LinkIcon size={16} /> Link with partner
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-12 h-12 rounded-2xl bg-white/90 flex items-center justify-center font-display font-extrabold text-rose-600 text-lg shadow-cute">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-1 border-b border-rose-100 last:border-b-0">
      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-rose-700 font-bold truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}
