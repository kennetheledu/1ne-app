"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronRight, Eye, Gift, Lock, Send, Sparkles, Star, X, Zap } from "lucide-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Toast } from "../components/ui/Toast";
import { useMe } from "../lib/useMe";
import { useActiveTasks, useAllTasks, useMyAchievements, usePendingApprovals, useStreak } from "../lib/useTasks";
import { useThreadMessages } from "../lib/useThreads";
import {
  approveTaskSubmission,
  createTaskViaAdmin,
  DIFFICULTY_POINTS,
  getPartner,
  rejectTaskSubmission,
  revealSurpriseTask,
  sendThreadMessage,
  submitTaskCompletion,
  toggleReaction,
  getSubmissionTask,
  type MessageReaction,
  type TaskDifficulty,
  type TaskDoc,
  type TaskSubmissionDoc,
  type TaskType,
} from "../lib/firebase";
import { cn } from "../utils/cn";

type TabId = "active" | "review" | "daily" | "longTerm" | "surprise" | "all" | "admin";

export function Tasks() {
  return (
    <ErrorBoundary fallback={(error) => <TaskError error={error} />}>
      <TasksContent />
    </ErrorBoundary>
  );
}

function TasksContent() {
  const me = useMe();
  const rawAllTasks = useAllTasks(me?.uid);
  const rawActive = useActiveTasks(me?.uid);
  const rawPending = usePendingApprovals(me?.uid);
  const rawAchievements = useMyAchievements(me?.uid);
  const streak = useStreak(me?.uid);
  const partner = useMemo(() => (me ? getPartner(me) : null), [me]);

  const allTasks = Array.isArray(rawAllTasks) ? rawAllTasks : [];
  const active = Array.isArray(rawActive) ? rawActive : [];
  const pending: TaskSubmissionDoc[] = Array.isArray(rawPending) ? rawPending : [];
  const achievements = Array.isArray(rawAchievements) ? rawAchievements : [];

  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("active");
  const [revealConfirm, setRevealConfirm] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [threadContext, setThreadContext] = useState<{ threadId: string; title: string } | null>(null);
  const [threadMsg, setThreadMsg] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cType, setCType] = useState<TaskType>("daily");
  const [cDiff, setCDiff] = useState<TaskDifficulty>("easy");
  const [cPts, setCPts] = useState("20");

  const threadMessages = useThreadMessages(threadContext?.threadId ?? null);

  useEffect(() => {
    console.log("Task debug", {
      user: me,
      relationship: me?.relationshipId ?? null,
      tasks: allTasks,
      active,
      pending,
    });
  }, [me?.uid, me?.relationshipId, allTasks.length, active.length, pending.length]);

  if (!me) {
    return <TaskSkeleton message="Loading task workspace..." />;
  }

  const isAdmin = me.role === "admin";
  const dailyTasks = active.filter((task) => task.taskType === "daily");
  const longTermTasks = active.filter((task) => task.taskType === "longTerm");
  const surpriseTasks = active.filter((task) => task.taskType === "surprise");
  const completedTasks = allTasks.filter((task) => task.status === "completed");

  const tabs = [
    { id: "active" as const, label: "Active", count: active.length },
    { id: "review" as const, label: "Review", count: pending.length },
    { id: "daily" as const, label: "Daily", count: dailyTasks.length },
    { id: "longTerm" as const, label: "Long-term", count: longTermTasks.length },
    { id: "surprise" as const, label: "Surprise", count: surpriseTasks.length },
    { id: "all" as const, label: "History", count: completedTasks.length },
    ...(isAdmin ? [{ id: "admin" as const, label: "Create", count: 0 }] : []),
  ];

  async function run(id: string, fn: () => void | Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
    } catch (error) {
      console.error("Task action failed", error);
      setToast({ kind: "error", msg: error instanceof Error ? error.message : "Task action failed" });
    } finally {
      setBusy(null);
    }
  }

  const visibleTasks =
    tab === "daily" ? dailyTasks : tab === "longTerm" ? longTermTasks : tab === "surprise" ? surpriseTasks : active;

  return (
    <div className="space-y-4 min-h-[60vh]">
      <div className="text-black sr-only">TASK PAGE LOADED</div>
      {toast && <Toast kind={toast.kind} message={toast.msg} onClose={() => setToast(null)} />}

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[28px] gradient-pastel p-5 shadow-soft border border-white/80 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/35 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">Tasks</div>
            <div className="font-display text-3xl font-extrabold text-rose-700 mt-1">{active.length} active</div>
            <div className="text-sm text-rose-500 mt-1">{pending.length > 0 ? `${pending.length} need your review` : "No pending reviews"}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-extrabold text-rose-700">{streak?.current ?? 0}</div>
            <div className="text-xs text-gray-500">day streak</div>
          </div>
        </div>
      </motion.div>

      {achievements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
          {achievements.map((achievement) => (
            <span key={achievement.id} className="shrink-0 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              {achievement.icon} {achievement.title}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={cn("shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition-all", tab === item.id ? "bg-rose-500 text-white border-rose-500 shadow-cute" : "bg-white/80 text-rose-500 border-rose-100")}>
            {item.label}{item.count > 0 && ` (${item.count})`}
          </button>
        ))}
      </div>

      {tab !== "review" && tab !== "all" && tab !== "admin" && (
        <TaskList
          tasks={visibleTasks}
          emptyLabel={tab === "active" ? "No active tasks yet." : `No ${tab} tasks yet.`}
          busy={busy}
          onReveal={(id) => setRevealConfirm(id)}
          onSubmit={(id) => { setSubmitModal(id); setSubmitNote(""); }}
          onThread={(id) => {
            const task = allTasks.find((item) => item.id === id);
            if (task?.threadId) {
              setThreadContext({ threadId: task.threadId, title: task.title });
            }
          }}
        />
      )}

      {tab === "review" && (
        <ReviewList
          tasks={pending}
          busy={busy}
          onApprove={(submission) => run(submission.id, () => approveTaskSubmission(me.uid, submission.id))}
          onReject={(id) => { setRejectModal(id); setRejectNote(""); }}
          onThread={async (submission) => {
            setBusy(submission.id);
            try {
              setThreadContext({ threadId: submission.threadId, title: "Task thread" });
            } finally {
              setBusy(null);
            }
          }}
        />
      )}

      {tab === "all" && <CompletedList tasks={completedTasks} />}

      {tab === "admin" && isAdmin && (
        <AdminCreateTask
          busy={busy}
          title={cTitle}
          description={cDesc}
          type={cType}
          difficulty={cDiff}
          points={cPts}
          onTitle={setCTitle}
          onDescription={setCDesc}
          onType={setCType}
          onDifficulty={(diff) => { setCDiff(diff); setCPts(String(DIFFICULTY_POINTS[diff])); }}
          onPoints={setCPts}
          onCreate={() => run("create", async () => {
            const users = partner ? [me.uid, partner.uid] : [me.uid];
            await createTaskViaAdmin(
              cTitle,
              cDesc, // used as prompt
              cType,  // used as category
              cDiff,
              Number(cPts) || 20
            );
            setCTitle("");
            setCDesc("");
            setToast({ kind: "success", msg: "Task created" });
          })}
        />
      )}

      <AnimatePresence>
        {revealConfirm && (
          <Modal onClose={() => setRevealConfirm(null)}>
            <div className="text-center">
              <Lock className="mx-auto mb-3 text-rose-500" size={36} />
              <h3 className="font-display text-xl font-extrabold text-rose-700">Surprise task warning</h3>
              <p className="text-sm text-gray-600 mt-2">Opening this task means you commit to completing it. It cannot be removed or hidden again.</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="ghost" onClick={() => setRevealConfirm(null)}>Cancel</Button>
                <Button onClick={() => { 
                  const id = revealConfirm; 
                  setRevealConfirm(null); 
                  if (id) {
                    run(id, async () => {
                      await revealSurpriseTask(me.uid, id);
                      setToast({ kind: "success", msg: "Surprise revealed" });
                    });
                  }
                }}>Reveal Task</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitModal && (
          <Modal onClose={() => setSubmitModal(null)}>
            <h3 className="font-display text-lg font-extrabold text-rose-700 mb-2">Submit for approval</h3>
            <Input placeholder="Describe what you did" value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} />
            <Button fullWidth className="mt-3" onClick={() => { 
              const id = submitModal; 
              setSubmitModal(null); 
              if (id) {
                run(id, async () => { 
                  await submitTaskCompletion(me.uid, id, submitNote); 
                  setToast({ kind: "success", msg: "Submitted for partner approval" }); 
                }); 
              }
            }}>
              <Send size={16} /> Submit
            </Button>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectModal && (
          <Modal onClose={() => setRejectModal(null)}>
            <h3 className="font-display text-lg font-extrabold text-rose-700 mb-2">Reject submission</h3>
            <Input placeholder="Reason" value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} />
            <Button fullWidth variant="danger" className="mt-3" onClick={() => { 
              const id = rejectModal; 
              setRejectModal(null); 
              if (id) {
                run(id, async () => { 
                  await rejectTaskSubmission(me.uid, id, rejectNote); 
                  setToast({ kind: "info", msg: "Rejected" }); 
                }); 
              }
            }}>
              <X size={16} /> Reject
            </Button>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {threadContext && (
          <Modal onClose={() => setThreadContext(null)}>
            <h3 className="font-display text-lg font-extrabold text-rose-700 mb-2">{threadContext.title}</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-3 scrollbar-none">
              {threadMessages.length === 0 ? <div className="text-center text-sm text-gray-400 py-6">No messages yet.</div> : threadMessages.map((message) => (
                <div key={message.id} className={cn("max-w-[85%] rounded-[20px] px-3 py-2 text-sm", message.senderUid === me.uid ? "ml-auto bg-gradient-to-br from-rose-400 to-pink-400 text-white rounded-br-lg" : "bg-white border border-rose-100 text-gray-800 rounded-bl-lg")}>
                  <div>{message.text}</div>
                  <div className="flex gap-1 mt-1">
                    {(["❤️", "😂", "🔥", "🥺", "✨", "👏"] as MessageReaction[]).map((reaction) => (
                      <button 
                        key={reaction} 
                        onClick={() => run(message.id, () => toggleReaction(me.uid, message.id, reaction))} 
                        className="text-xs opacity-50 hover:opacity-100"
                        disabled={busy !== null}
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Message..." 
                value={threadMsg} 
                onChange={(event) => setThreadMsg(event.target.value)} 
                onKeyDown={(event) => { 
                  if (event.key === "Enter" && threadMsg.trim() && threadContext.threadId) { 
                    run("send", async () => {
                      await sendThreadMessage(me.uid, threadContext.threadId, threadMsg);
                      setThreadMsg("");
                    });
                  } 
                }} 
              />
              <Button onClick={() => { 
                if (threadMsg.trim() && threadContext?.threadId) { 
                  run("send", async () => {
                    await sendThreadMessage(me.uid, threadContext.threadId, threadMsg);
                    setThreadMsg("");
                  });
                } 
              }}><Send size={16} /></Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskList({ tasks, emptyLabel, busy, onReveal, onSubmit, onThread }: { tasks: TaskDoc[]; emptyLabel: string; busy: string | null; onReveal: (id: string) => void; onSubmit: (id: string) => void; onThread: (id: string) => void }) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <EmptyCard icon={<Sparkles className="mx-auto mb-2 opacity-40" size={24} />} label={emptyLabel} />;
  }
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => <TaskCard key={task.id} task={task} busy={busy} onReveal={() => onReveal(task.id)} onSubmit={() => onSubmit(task.id)} onThread={() => onThread(task.id)} />)}
      </AnimatePresence>
    </div>
  );
}

function ReviewList({ tasks, busy, onApprove, onReject, onThread }: { tasks: TaskSubmissionDoc[]; busy: string | null; onApprove: (submission: TaskSubmissionDoc) => void; onReject: (id: string) => void; onThread: (submission: TaskSubmissionDoc) => void }) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <EmptyCard icon={<Check className="mx-auto mb-2 opacity-40" size={24} />} label="Nothing to review." />;
  }
  return <div className="space-y-3">{tasks.map((submission) => <ReviewCard key={submission.id} submission={submission} busy={busy} onApprove={() => onApprove(submission)} onReject={() => onReject(submission.id)} onThread={() => onThread(submission)} />)}</div>;
}

function CompletedList({ tasks }: { tasks: TaskDoc[] }) {
  return (
    <Card>
      <CardHeader title="Completed tasks" subtitle="Approved and archived" />
      <div className="space-y-2">
        {!Array.isArray(tasks) || tasks.length === 0 ? <div className="text-center py-8 text-sm text-gray-400">No completed tasks yet.</div> : tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl bg-mint-50 border border-mint-100">
            <div className="min-w-0"><div className="font-bold text-sm text-emerald-700 truncate">{task.title}</div><div className="text-[11px] text-gray-500">{task.taskType} · {task.difficulty}</div></div>
            <div className="text-sm font-extrabold text-emerald-600">+{task.points}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminCreateTask(props: { busy: string | null; title: string; description: string; type: TaskType; difficulty: TaskDifficulty; points: string; onTitle: (v: string) => void; onDescription: (v: string) => void; onType: (v: TaskType) => void; onDifficulty: (v: TaskDifficulty) => void; onPoints: (v: string) => void; onCreate: () => void }) {
  return (
    <Card>
      <CardHeader title="Create task" subtitle="Manual task management" />
      <div className="space-y-2">
        <Input placeholder="Task title" value={props.title} onChange={(event) => props.onTitle(event.target.value)} />
        <Input placeholder="Description" value={props.description} onChange={(event) => props.onDescription(event.target.value)} />
        <div className="grid grid-cols-3 gap-2">{(["daily", "longTerm", "surprise"] as TaskType[]).map((item) => <button key={item} onClick={() => props.onType(item)} className={cn("rounded-2xl py-2 text-xs font-bold border", props.type === item ? "bg-rose-500 text-white border-rose-500" : "bg-white text-rose-500 border-rose-100")}>{item}</button>)}</div>
        <div className="grid grid-cols-3 gap-2">{(["easy", "medium", "hard"] as TaskDifficulty[]).map((item) => <button key={item} onClick={() => props.onDifficulty(item)} className={cn("rounded-2xl py-2 text-xs font-bold border", props.difficulty === item ? "bg-violet-500 text-white border-violet-500" : "bg-white text-violet-500 border-violet-100")}>{item} ({DIFFICULTY_POINTS[item]})</button>)}</div>
        <Input type="number" placeholder="Points" value={props.points} onChange={(event) => props.onPoints(event.target.value)} />
        <Button fullWidth disabled={props.busy !== null || !props.title.trim()} onClick={props.onCreate}><Zap size={16} /> Create task</Button>
      </div>
    </Card>
  );
}

function TaskCard({ task, busy, onReveal, onSubmit, onThread }: { task: TaskDoc; busy: string | null; onReveal: () => void; onSubmit: () => void; onThread: () => void }) {
  const isSurpriseHidden = task.taskType === "surprise" && !task.revealed;
  const toneMap = { daily: "from-rose-100 to-pink-50", longTerm: "from-lavender-100 to-violet-50", surprise: "from-amber-100 to-peach-50" };
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className={cn("rounded-[28px] border border-white bg-white/85 backdrop-blur-sm shadow-soft p-4 overflow-hidden", isSurpriseHidden && "bg-gradient-to-br from-amber-50 to-peach-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2"><span className={cn("px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-br", toneMap[task.taskType])}>{isSurpriseHidden ? "Hidden" : task.taskType}</span><span className="text-[11px] font-bold text-gray-400 uppercase">{task.difficulty}</span></div>
        <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1"><Gift size={12} />{task.points}</span>
      </div>
      {isSurpriseHidden ? (
        <div className="mt-3"><h3 className="font-display font-extrabold text-xl text-rose-700">Hidden task</h3><p className="text-sm text-gray-500 mt-1">Reveal to see what's inside. Once opened, it's mandatory.</p><Button className="mt-3" variant="secondary" onClick={onReveal} disabled={busy !== null}><Eye size={16} /> Reveal task</Button></div>
      ) : (
        <div className="mt-3"><h3 className="font-display font-extrabold text-xl text-rose-700">{task.title}</h3><p className="text-sm text-gray-600 mt-1 leading-relaxed">{task.description}</p>{task.rejectionNote && <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{task.rejectionNote}</div>}<div className="flex gap-2 mt-3"><Button size="sm" onClick={onSubmit} disabled={busy !== null || task.status !== "active" || task.submissionLocked}><Send size={14} /> Submit</Button></div></div>
      )}
    </motion.div>
  );
}

function ReviewCard({ submission, busy, onApprove, onReject, onThread }: { submission: TaskSubmissionDoc; busy: string | null; onApprove: () => void; onReject: () => void; onThread: () => void }) {
  const me = useMe();
  const canModerate = !!me && me.uid === submission.assignedPartner && me.uid !== submission.submittedBy;
  const statusLabel = submission.status === "rejected" ? "Rejected" : submission.status === "approved" ? "Approved" : "Pending";
  const statusTone = submission.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" : submission.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="rounded-[28px] border border-rose-100 bg-white/85 shadow-soft p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-display font-extrabold text-lg text-rose-700">Task review</span><span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold uppercase", statusTone)}>{statusLabel}</span></div><div className="text-sm text-gray-500 mt-1">{submission.submissionNote || "Task submitted"}</div></div><span className="text-xs font-extrabold text-amber-600 flex items-center gap-1"><Star size={12} />{submission.points}</span></div>
      <div className="flex gap-2 mt-3">
        {canModerate ? (
          <>
            <Button size="sm" onClick={onApprove} disabled={busy !== null}><Check size={14} /> Approve</Button>
            <Button size="sm" variant="ghost" onClick={onReject} disabled={busy !== null}><X size={14} /></Button>
          </>
        ) : null}
        {submission.threadId && <Button size="sm" variant="ghost" onClick={onThread}><ChevronRight size={14} /> Thread</Button>}
      </div>
    </motion.div>
  );
}

function EmptyCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <Card><div className="text-center py-10 text-sm text-gray-400">{icon}{label}</div></Card>;
}

function TaskSkeleton({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] gradient-pastel p-5 shadow-soft border border-white/80"><div className="h-8 w-32 rounded-xl bg-white/60 animate-pulse" /><div className="h-4 w-44 rounded-xl bg-white/50 animate-pulse mt-3" /></div>
      <Card><div className="text-center py-8 text-sm text-gray-400">{message}</div></Card>
    </div>
  );
}

function TaskError({ error }: { error: Error }) {
  return (
    <Card className="border-rose-200 bg-rose-50/80">
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto mb-2 text-rose-500" size={28} />
        <div className="font-display font-extrabold text-rose-700">Task page error</div>
        <p className="text-sm text-rose-600 mt-2">{error.message}</p>
      </div>
    </Card>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative z-[80] w-full max-w-md rounded-[32px] bg-white shadow-2xl p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}