import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageCircle, X, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useMe } from "../lib/useMe";
import {
  getFavorRequests,
  getFavorRequestsToReview,
  submitFavorRequest,
  respondToFavorRequest,
  respondToCounter,
  getNegotiationsFor,
  FAVOR_TIER_POINTS,
  type FavorRequestDoc,
  type FavorTier,
} from "../lib/firebase";

export function Favors() {
  return (
    <ErrorBoundary fallback={(error) => <FavorError error={error} />}>
      <FavorsContent />
    </ErrorBoundary>
  );
}

function FavorsContent() {
  const me = useMe();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTier, setSelectedTier] = useState<FavorTier>(2);
  const [pointCost, setPointCost] = useState("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" />
      </div>
    );
  }

  const [allFavors, setAllFavors] = useState<FavorRequestDoc[]>([]);
  const [toReview, setToReview] = useState<FavorRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!me) return;
      setLoading(true);
      try {
        const [all, review] = await Promise.all([
          getFavorRequests(me.uid),
          getFavorRequestsToReview(me.uid)
        ]);
        setAllFavors(Array.isArray(all) ? all : []);
        setToReview(Array.isArray(review) ? review : []);
      } catch (err) {
        console.error("[Favors] Load error:", err);
        setError("Failed to load favors. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [me]);

  const safeFavors = Array.isArray(allFavors) ? allFavors : [];
  const active = safeFavors.filter(
    (f) => f && (f.status === "pending_review" || f.status === "countered")
  );

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" /></div>;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title required");
      return;
    }
    const cost = parseInt(pointCost, 10);
    if (isNaN(cost) || cost <= 0) {
      setError("Point cost must be positive");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await submitFavorRequest(me.uid, title, description, selectedTier, cost);
      setTitle("");
      setDescription("");
      setPointCost("");
      setSelectedTier(2);
      setShowForm(false);
      // Refresh the list
      const all = await getFavorRequests(me.uid);
      setAllFavors(all || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-[28px] gradient-rose p-5 shadow-soft border border-white/80 flex-1">
          <div className="font-display text-3xl font-extrabold text-white">Favors</div>
          <p className="text-sm text-white/90 mt-1">Request, negotiate, and complete couple favors.</p>
        </div>
        <Button size="md" onClick={() => setShowForm(!showForm)} className="ml-2 shrink-0" title="New favor request">
          <Plus size={18} />
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card>
              <CardHeader title="New favor request" subtitle="Describe what you'd like and suggest a tier" />
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-3">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <Input placeholder="What do you want? (e.g., 'Buy me coffee')" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea
                  placeholder="More details... (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl border border-rose-200 focus:border-rose-400 focus:outline-none resize-none"
                  rows={3}
                />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2">Suggest a tier</div>
                  <div className="flex gap-2 mb-2">
                    {([1, 2, 3] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        type="button"
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          selectedTier === tier
                            ? tier === 1
                              ? "bg-emerald-500 text-white"
                              : tier === 2
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Tier {tier} ({FAVOR_TIER_POINTS[tier]} pts)
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Point cost (e.g., 40)"
                  type="number"
                  value={pointCost}
                  onChange={(e) => setPointCost(e.target.value)}
                  min="1"
                />
                <div className="flex gap-2">
                  <Button fullWidth onClick={handleSubmit} disabled={busy}>
                    Send Request
                  </Button>
                  <Button fullWidth variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {toReview.length > 0 && (
        <Card>
          <CardHeader title="Pending review" subtitle={`${toReview.length} request${toReview.length === 1 ? "" : "s"} waiting for your input`} />
          <div className="space-y-2">
            {toReview.map((req) => (
              <FavorReviewCard key={req.id} request={req} meUid={me.uid} />
            ))}
          </div>
        </Card>
      )}

      {active.length === 0 && toReview.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-sm text-gray-400">
            <MessageCircle className="mx-auto mb-2 opacity-40" size={26} />
            No active favors. Create one to get started!
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Active favors" />
          <div className="space-y-2">
            {active.map((req) => (
              <FavorCard key={req.id} request={req} meUid={me.uid} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FavorCard({ request, meUid }: { request: FavorRequestDoc; meUid: string }) {
  const statusLabels: Record<FavorRequestDoc["status"], string> = {
    pending_review: "Pending",
    countered: "Countered",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    expired: "Expired",
  };

  const statusColors: Record<FavorRequestDoc["status"], string> = {
    pending_review: "text-amber-600",
    countered: "text-blue-600",
    accepted: "text-green-600",
    rejected: "text-red-600",
    withdrawn: "text-gray-600",
    expired: "text-gray-500",
  };

  const [negotiations, setNegotiations] = useState<NegotiationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getNegotiationsFor(request.id);
        setNegotiations(data || []);
      } catch (err) {
        console.error("[FavorCard] Error fetching negotiations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [request.id]);

  const last = negotiations && negotiations.length > 0 ? negotiations[negotiations.length - 1] : null;
  const summary = last
    ? last.action === "submit"
      ? `Suggested tier ${last.tier} for ${last.pointCost} pts`
      : last.action === "counter"
      ? `Countered to tier ${last.tier} for ${last.pointCost} pts`
      : last.action === "accept" || request.status === "accepted"
      ? `Accepted at ${last.pointCost} pts`
      : last.action === "reject"
      ? `Rejected${last.note ? `: ${last.note}` : ""}`
      : last.action === "withdraw"
      ? "Withdrawn"
      : ""
    : "No offer details.";

  const isRequester = request.requesterUid === meUid;

  const handleAcceptCounter = async () => {
    try {
      await respondToCounter(meUid, request.id, "accept");
    } catch (err) {
      console.error(err);
    }
  };

  const handleWithdrawCounter = async () => {
    try {
      await respondToCounter(meUid, request.id, "withdraw");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800">{request.title}</div>
          <div className="text-xs text-gray-600 mt-0.5">{request.description}</div>
          <div className="text-xs text-rose-600 font-semibold mt-1">Round {request.currentRound} / {request.maxRounds}</div>
          <div className="text-xs text-gray-500 mt-1">{loading ? "Loading details..." : summary}</div>
        </div>
        <div className={`shrink-0 text-right text-xs font-semibold ${statusColors[request.status]}`}>
          {statusLabels[request.status]}
        </div>
      </div>
      {request.status === "countered" && isRequester && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAcceptCounter}
            className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600"
          >
            Accept Counter
          </button>
          <button
            onClick={handleWithdrawCounter}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-400"
          >
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
}

function FavorReviewCard({ request, meUid }: { request: FavorRequestDoc; meUid: string }) {
  const [mode, setMode] = useState<"none" | "counter" | "reject">("none");
  const [selectedTier, setSelectedTier] = useState<FavorTier>(2);
  const [pointCost, setPointCost] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await respondToFavorRequest(meUid, request.id, "accept");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCounter = async () => {
    const cost = parseInt(pointCost, 10);
    if (isNaN(cost) || cost <= 0) return;
    setBusy(true);
    try {
      await respondToFavorRequest(meUid, request.id, "counter", selectedTier, cost);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setBusy(true);
    try {
      await respondToFavorRequest(meUid, request.id, "reject", undefined, undefined, rejectNote);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <div className="font-semibold text-gray-800 mb-2">{request.title}</div>
      <div className="text-xs text-gray-600 mb-3">{request.description}</div>
      {mode === "none" && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={busy}
            className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50"
          >
            Accept Request
          </button>
          <button
            onClick={() => setMode("counter")}
            disabled={busy}
            className="flex-1 px-2 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            Counter Request
          </button>
          <button
            onClick={() => setMode("reject")}
            disabled={busy}
            className="px-2 py-1.5 rounded-lg bg-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-400 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {mode === "counter" && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-amber-700">Counter with tier and cost</div>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                type="button"
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedTier === tier
                    ? tier === 1
                      ? "bg-emerald-500 text-white"
                      : tier === 2
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                    : "bg-white border border-amber-300 text-gray-700 hover:bg-amber-50"
                }`}
              >
                Tier {tier}
              </button>
            ))}
          </div>
          <Input
            placeholder="Counter cost"
            type="number"
            value={pointCost}
            onChange={(e) => setPointCost(e.target.value)}
            min="1"
          />
          <div className="flex gap-2">
            <Button fullWidth onClick={handleCounter} disabled={busy || !pointCost.trim()}>
              Submit Counter
            </Button>
            <Button fullWidth variant="outline" onClick={() => setMode("none")}>Cancel</Button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="space-y-3">
          <textarea
            placeholder="Reason for rejection (required)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-red-300 text-xs resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <Button fullWidth variant="danger" onClick={handleReject} disabled={busy || !rejectNote.trim()}>
              Reject Request
            </Button>
            <Button fullWidth variant="outline" onClick={() => setMode("none")}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FavorError({ error }: { error: Error }) {
  return (
    <Card className="border-rose-200 bg-rose-50/80">
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto mb-2 text-rose-500" size={28} />
        <div className="font-display font-extrabold text-rose-700">Favor page error</div>
        <p className="text-sm text-rose-600 mt-2">{error.message}</p>
      </div>
    </Card>
  );
}
