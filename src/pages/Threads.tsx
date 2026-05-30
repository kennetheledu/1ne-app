import { useEffect, useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Send, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useMe } from "../lib/useMe";
import { useAllTasks } from "../lib/useTasks";
import { useThreadMessages, useThreads } from "../lib/useThreads";
import { sendThreadMessage, toggleReaction, respondToFavorRequest, respondToCounter, getFavorRequest } from "../lib/firebase";
import type { FavorRequestDoc, MessageReaction, ThreadDoc } from "../lib/firebaseTypes";

export function Threads() {
  const me = useMe();
  const allTasks = useAllTasks(me?.uid);
  const threads = useThreads(me?.uid);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!me) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl gradient-rose shadow-cute animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] gradient-pastel p-5 shadow-soft border border-white/80">
        <div className="font-display text-3xl font-extrabold text-rose-700">Threads</div>
        <p className="text-sm text-rose-500 mt-1">Task conversations, rejections, counters, and favor negotiations.</p>
      </div>
      {threads.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-sm text-gray-400">
            <MessageCircle className="mx-auto mb-2 opacity-40" size={26} />
            No threads yet. Threads appear after task submissions or favor assignments.
          </div>
        </Card>
      ) : (
        threads.map((thread) => {
          if (thread.type === "taskThread") {
            const task = allTasks.find(t => t.id === thread.linkedTaskId);
            if (!task) return null;
            return (
              <ThreadCard
                key={thread.id}
                thread={thread}
                title={task.title}
                meUid={me.uid}
                isExpanded={expandedId === thread.id}
                onToggle={() => setExpandedId(expandedId === thread.id ? null : thread.id)}
              />
            );
          } else if (thread.type === "favorNegotiation") {
            return (
              <FavorNegotiationThread
                key={thread.id}
                thread={thread}
                meUid={me.uid}
                isExpanded={expandedId === thread.id}
                onToggle={() => setExpandedId(expandedId === thread.id ? null : thread.id)}
              />
            );
          }
          return null;
        })
      )}
    </div>
  );
}

function ThreadCard({
  thread,
  title,
  meUid,
  isExpanded,
  onToggle,
}: {
  thread: ThreadDoc;
  title: string;
  meUid: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const messages = useThreadMessages(thread.id);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const last = messages[messages.length - 1];

  const handleSend = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      await sendThreadMessage(meUid, thread.id, message);
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReaction = async (msgId: string, reaction: MessageReaction) => {
    try {
      await toggleReaction(meUid, thread.id, msgId, reaction);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div layout>
      <Card className={isExpanded ? "relative z-10" : ""}>
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardHeader title={title} subtitle={`${messages.length} messages`} />
            </div>
            <div className="shrink-0 pr-4 text-rose-500">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-rose-100 pt-4 mt-3"
            >
              {/* Messages */}
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">No messages yet.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.senderUid === meUid ? "flex-row-reverse" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-200 shrink-0" />
                      <div className={msg.senderUid === meUid ? "text-right" : ""}>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm max-w-xs break-words ${
                            msg.senderUid === meUid
                              ? "bg-rose-500 text-white"
                              : "bg-rose-50 text-gray-700 border border-rose-200"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {Object.keys(msg.reactions).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap text-xs">
                            {Object.entries(msg.reactions).map(([reaction, users]) => (
                              users.length > 0 && (
                                <button
                                  key={reaction}
                                  onClick={() => handleReaction(msg.id, reaction as MessageReaction)}
                                  className="px-2 py-1 rounded-full bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer"
                                >
                                  {reaction} {users.length > 1 ? users.length : ""}
                                </button>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="md"
                  onClick={handleSend}
                  disabled={!message.trim() || busy}
                  title="Send message"
                >
                  <Send size={16} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm text-gray-600 mt-2">
            {last?.text ?? "No messages yet."}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function FavorNegotiationThread({
  thread,
  meUid,
  isExpanded,
  onToggle,
}: {
  thread: ThreadDoc;
  meUid: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const messages = useThreadMessages(thread.id);
  const [message, setMessage] = useState("");
  const [counterTier, setCounterTier] = useState<1 | 2 | 3>(2);
  const [counterCost, setCounterCost] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const last = messages[messages.length - 1];
  const [favorRequest, setFavorRequest] = useState<FavorRequestDoc | null>(null);

  useEffect(() => {
    if (thread.linkedRequestId) {
      async function fetch() {
        try {
          const data = await getFavorRequest(thread.linkedRequestId!);
          setFavorRequest(data);
        } catch (err) {
          console.error("[Threads] Error loading favor request:", err);
        }
      }
      fetch();
    }
  }, [thread.linkedRequestId]);

  const isRequester = favorRequest?.requesterUid === meUid;
  const isReviewer = favorRequest?.reviewerUid === meUid;

  const canReview = favorRequest?.status === "pending_review" && isReviewer;
  const canRespondToCounter = favorRequest?.status === "countered" && isRequester;

  const handleSend = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      await sendThreadMessage(meUid, thread.id, message);
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCounter = async () => {
    if (!counterCost.trim() || !favorRequest || busy) return;
    const points = parseInt(counterCost, 10);
    if (isNaN(points) || points <= 0) return;
    setBusy(true);
    try {
      respondToFavorRequest(meUid, favorRequest.id, "counter", counterTier, points);
      setCounterCost("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!favorRequest || busy) return;
    setBusy(true);
    try {
      respondToFavorRequest(meUid, favorRequest.id, "accept");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!favorRequest || busy || !rejectNote.trim()) return;
    setBusy(true);
    try {
      respondToFavorRequest(meUid, favorRequest.id, "reject", undefined, undefined, rejectNote.trim());
      setRejectNote("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptCounter = async () => {
    if (!favorRequest || busy) return;
    setBusy(true);
    try {
      respondToCounter(meUid, favorRequest.id, "accept");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    if (!favorRequest || busy) return;
    setBusy(true);
    try {
      respondToCounter(meUid, favorRequest.id, "withdraw");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReaction = async (msgId: string, reaction: MessageReaction) => {
    try {
      await toggleReaction(meUid, thread.id, msgId, reaction);
    } catch (err) {
      console.error(err);
    }
  };

  if (!favorRequest) return null;

  return (
    <motion.div layout>
      <Card className={isExpanded ? "relative z-10" : ""}>
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardHeader
                title={`${favorRequest.title}`}
                subtitle={`Round ${favorRequest.currentRound}/${favorRequest.maxRounds} · Status: ${favorRequest.status}`}
              />
            </div>
            <div className="shrink-0 pr-4 text-rose-500">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-rose-100 pt-4 mt-3"
            >
              {/* Messages */}
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">Negotiation started.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.senderUid === meUid ? "flex-row-reverse" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-200 shrink-0" />
                      <div className={msg.senderUid === meUid ? "text-right" : ""}>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm max-w-xs break-words ${
                            msg.senderUid === meUid
                              ? "bg-rose-500 text-white"
                              : "bg-rose-50 text-gray-700 border border-rose-200"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {Object.keys(msg.reactions).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap text-xs">
                            {Object.entries(msg.reactions).map(([reaction, users]) => (
                              users.length > 0 && (
                                <button
                                  key={reaction}
                                  onClick={() => handleReaction(msg.id, reaction as MessageReaction)}
                                  className="px-2 py-1 rounded-full bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer"
                                >
                                  {reaction} {users.length > 1 ? users.length : ""}
                                </button>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Round 2: Reviewer options */}
              {canReview && (
                <div className="mb-3 space-y-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2">Reviewer Actions (Round 2)</div>
                  
                  {/* Accept button */}
                  <button
                    onClick={handleAccept}
                    disabled={busy}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Check size={16} className="inline mr-1" /> Accept Request
                  </button>

                  {/* Counter offer section */}
                  <div className="border-t pt-2">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Or propose a counter:</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Tier</label>
                        <div className="flex gap-1">
                          {[1, 2, 3].map((t) => (
                            <button
                              key={t}
                              onClick={() => setCounterTier(t as 1 | 2 | 3)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                                counterTier === t
                                  ? "bg-blue-500 text-white"
                                  : "bg-white border border-blue-300 text-gray-700 hover:bg-blue-50"
                              }`}
                            >
                              Tier {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        placeholder="Points for counter..."
                        type="number"
                        value={counterCost}
                        onChange={(e) => setCounterCost(e.target.value)}
                        min="1"
                      />
                      <button
                        onClick={handleCounter}
                        disabled={!counterCost.trim() || busy}
                        className="w-full px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
                      >
                        Send Counter Offer
                      </button>
                    </div>
                  </div>

                  {/* Reject section */}
                  <div className="border-t pt-2">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Or reject:</div>
                    <textarea
                      placeholder="Reason for rejection..."
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none mb-2"
                      rows={2}
                    />
                    <button
                      onClick={handleReject}
                      disabled={!rejectNote.trim() || busy}
                      className="w-full px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                    >
                      <X size={16} className="inline mr-1" /> Reject Request
                    </button>
                  </div>
                </div>
              )}

              {/* Round 3: Requester responds to counter */}
              {canRespondToCounter && (
                <div className="mb-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-700">Counter offer presented. Accept or withdraw?</div>
                  <div className="flex gap-2">
                    <Button fullWidth onClick={handleAcceptCounter} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600">
                      <Check size={16} /> Accept
                    </Button>
                    <Button fullWidth onClick={handleWithdraw} disabled={busy} variant="outline">
                      Withdraw
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="md"
                  onClick={handleSend}
                  disabled={!message.trim() || busy}
                  title="Send message"
                >
                  <Send size={16} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm text-gray-600 mt-2">
            {last?.text ?? "Negotiating..."}
          </div>
        )}
      </Card>
    </motion.div>
  );
}