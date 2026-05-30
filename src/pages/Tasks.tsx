"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Gift, Lock, MessageCircle, Sparkles, CheckCircle } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SlideToConfirm } from "../components/ui/SlideToConfirm";
import { useMe } from "../lib/useMe";
import { TaskDoc } from "./firebaseTypes";
import { db } from "../lib/firebaseClient";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { revealTask, submitTask, approveTask, rejectTask } from "../lib/firebaseCallables";
import { cn } from "../utils/cn";

export function Tasks() {
  const me = useMe();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [tab, setTab] = useState<"mine" | "review">("mine");

  useEffect(() => {
    if (!me?.uid) return;
    const q = query(collection(db, "tasks"), where("assignedTo", "array-contains", me.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc)));
    });
    return () => unsub();
  }, [me?.uid]);

  const myTasks = tasks.filter(t => {
    if (t.status !== "active" && t.status !== "rejected") return false;
    if (t.type === 'daily') {
      const countdown = getCountdown(t.expiresAt);
      if (countdown === 'Expired') return false; // Daily tasks are gone after midnight
    }
    return true;
  });
  const reviewTasks = tasks.filter(t => t.status === "pending" && t.assignedTo[0] !== me?.uid);

  return (
    <div className="p-4 space-y-4 font-nunito bg-lavender-50 min-h-screen pb-24">
      <div className="flex gap-2 p-1 bg-white/50 rounded-2xl border border-white">
        <button 
          onClick={() => setTab("mine")}
          className={cn("flex-1 py-2 text-xs font-black rounded-xl transition-all", tab === "mine" ? "bg-rose-500 text-white shadow-cute" : "text-rose-400")}
        >
          My Tasks
        </button>
        <button 
          onClick={() => setTab("review")}
          className={cn("flex-1 py-2 text-xs font-black rounded-xl transition-all", tab === "review" ? "bg-rose-500 text-white shadow-cute" : "text-rose-400")}
        >
          Review {reviewTasks.length > 0 && `(${reviewTasks.length})`}
        </button>
      </div>

      <div className="space-y-4">
        {tab === "mine" ? (
          myTasks.length > 0 ? (
            myTasks.map(task => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-soft flex items-center justify-center mb-4 -rotate-3">
                <Sparkles size={32} className="text-rose-300" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All caught up!</p>
              <p className="text-xs text-slate-300 font-bold mt-1 px-8 text-center">No active tasks right now. Time to relax!</p>
            </div>
          )
        ) : (
          reviewTasks.length > 0 ? (
            reviewTasks.map(task => <ReviewCard key={task.id} task={task} />)
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-soft flex items-center justify-center mb-4 rotate-3">
                <CheckCircle size={32} className="text-emerald-300" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nothing to review</p>
              <p className="text-xs text-slate-300 font-bold mt-1 px-8 text-center">You've cleared all your partner's submissions!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const getCountdown = (expiresAt: any) => {
  if (!expiresAt) return null;
  const end = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  const diff = end.getTime() - new Date().getTime();
  if (diff <= 0) return "Expired";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }
  return `${hours}h ${mins}m left`;
};

function TaskCard({ task }: { task: TaskDoc }) {
  const isSurprise = task.type === "surprise" && !task.revealed;
  const me = useMe();
  const countdown = getCountdown(task.expiresAt);

  return (
    <motion.div layout className="bg-white rounded-[20px] p-5 shadow-soft border border-rose-50">
      <div className="flex justify-between items-start mb-3">
        <span className="px-2.5 py-1 bg-rose-50 text-rose-500 text-[10px] font-black uppercase rounded-lg">
          {task.type}
        </span>
        <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
          <Gift size={14} /> {task.pointReward}
        </div>
      </div>

      {isSurprise ? (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-2">
            <Lock className="text-slate-300" />
            <p className="text-xs text-slate-400 font-bold text-center">Once accepted, this must be completed.</p>
          </div>
          <SlideToConfirm onConfirm={() => revealTask(task.id)} />
          <button 
            onClick={() => deleteDoc(doc(db, "tasks", task.id))}
            className="w-full text-center text-[10px] font-bold text-slate-300 uppercase mt-2"
          >
            Dismiss Task
          </button>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-black text-slate-800 leading-tight">{task.title}</h3>
          <p className="text-sm text-slate-500 mt-1">{task.description}</p>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
              {countdown && <><Clock size={14} /> <span>{countdown}</span></>}
            </div>
            <Button 
              size="sm" 
              className="rounded-xl px-6 bg-rose-500 hover:bg-rose-600 text-white shadow-cute"
              onClick={() => submitTask(task.id, me?.uid || "", me?.displayName || "")}
            >
              Done
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}

function ReviewCard({ task }: { task: TaskDoc }) {
  const me = useMe();
  const onApprove = () => approveTask(task.id, me?.displayName || "");
  const onReject = () => rejectTask(task.id, me?.displayName || "");

  return (
    <Card className="p-5">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-black text-slate-800">{task.title}</h3>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Pending Approval</p>
        </div>
        <Button variant="ghost" className="text-indigo-500">
          <MessageCircle size={18} />
        </Button>
      </div>
      <div className="flex gap-2 mt-4">
        <Button 
          fullWidth 
          className="bg-emerald-500 text-white rounded-xl shadow-cute"
          onClick={onApprove}
        >Approve</Button>
        <Button 
          fullWidth 
          variant="ghost" 
          className="text-rose-500 border border-rose-100 rounded-xl"
          onClick={onReject}
        >Reject</Button>
      </div>
    </Card>
  );
}