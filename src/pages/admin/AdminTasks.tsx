import { useState } from "react";
import { Archive, Edit3, Plus, ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Toast } from "../../components/ui/Toast";
import { useMe } from "../../lib/useMe";
import { archiveTaskViaAdmin, createTaskViaAdmin, DIFFICULTY_POINTS, getAdminTasks, getNormalUsers, type TaskDifficulty, type TaskType } from "../../lib/firebase";
import { cn } from "../../utils/cn";

export function AdminTasks() {
  const me = useMe();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("daily");
  const [difficulty, setDifficulty] = useState<TaskDifficulty>("easy");
  const [points, setPoints] = useState("20");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; msg: string } | null>(null);

  if (!me) return null;
  const adminUid = me.uid;
  const users = getNormalUsers();
  const tasks = getAdminTasks(adminUid);

  function submit() {
    try {
      createTaskViaAdmin({
        uid: adminUid,
        title,
        description,
        taskType: type,
        difficulty,
        points: Number(points) || DIFFICULTY_POINTS[difficulty],
        assignedTo: assigned,
        expiresAt: null,
      });
      setTitle("");
      setDescription("");
      setAssigned([]);
      setToast({ kind: "success", msg: "Task created and assigned" });
    } catch (error) {
      setToast({ kind: "error", msg: error instanceof Error ? error.message : "Failed" });
    }
  }

  return (
    <div className="space-y-4">
      {toast && <Toast kind={toast.kind} message={toast.msg} onClose={() => setToast(null)} />}
      <Card className="bg-white border-slate-200">
        <CardHeader title="Task management" subtitle="Admins create and assign tasks only" />
        <div className="space-y-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "longTerm", "surprise"] as TaskType[]).map((item) => (
              <button key={item} onClick={() => setType(item)} className={cn("rounded-2xl py-2 text-xs font-bold border", type === item ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200")}>{item}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as TaskDifficulty[]).map((item) => (
              <button key={item} onClick={() => { setDifficulty(item); setPoints(String(DIFFICULTY_POINTS[item])); }} className={cn("rounded-2xl py-2 text-xs font-bold border", difficulty === item ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200")}>{item} {DIFFICULTY_POINTS[item]}</button>
            ))}
          </div>
          <Input type="number" placeholder="Points" value={points} onChange={(e) => setPoints(e.target.value)} />
          <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {users.length === 0 ? <div className="p-3 text-sm text-slate-400">No normal users yet.</div> : users.map((user) => (
              <label key={user.uid} className="flex items-center gap-3 p-3 text-sm">
                <input type="checkbox" checked={assigned.includes(user.uid)} onChange={(e) => setAssigned((prev) => e.target.checked ? [...prev, user.uid] : prev.filter((id) => id !== user.uid))} />
                <span className="font-semibold text-slate-700">{user.displayName}</span>
                <span className="text-slate-400 truncate">{user.email}</span>
              </label>
            ))}
          </div>
          <Button fullWidth onClick={submit} disabled={!title || !description || assigned.length === 0}>
            <Plus size={16} /> Create task
          </Button>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
            <ShieldAlert size={14} className="shrink-0" /> Admins cannot approve, award points, modify wallets, or manipulate streaks.
          </div>
        </div>
      </Card>

      <Card className="bg-white border-slate-200">
        <CardHeader title="All tasks" subtitle={`${tasks.length} total`} />
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{task.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{task.taskType} · {task.difficulty} · {task.points} pts · {task.status}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled><Edit3 size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => archiveTaskViaAdmin(adminUid, task.id)}><Archive size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}