"use client";
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebaseClient";
import { Card, CardHeader } from "../components/ui/Card";
import { Shield, List, Activity, PlusCircle, Users, Archive, Trash2 } from "lucide-react";
import { AuditLogDoc, TaskDoc } from "../lib/firebaseTypes";
import { adminCreateTask, adminGetMembers, adminArchiveTask, adminDeleteTask, getSystemHealth } from "./firebaseCallables";
import { UserDoc } from "../pages/firebaseTypes";
import { useMe } from "./useMe";

export function AdminDashboard() {
  const [stats, setStats] = useState({ members: 0, activeTasks: 0 });
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [tab, setTab] = useState<"overview" | "tasks" | "audit">("overview");
  const [members, setMembers] = useState<UserDoc[]>([]);
  const [allTasks, setAllTasks] = useState<TaskDoc[]>([]);
  const [health, setHealth] = useState<{ status: string; details: string }>({ status: "Checking...", details: "" });
  const me = useMe();

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "daily" as any,
    assignedTo: "both" as string,
    pointReward: 5,
    expiry: ""
  });

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // Count everyone who isn't an admin as a member to be safe
        const memberQuery = query(collection(db, "users"), where("role", "!=", "admin"));
        const taskQuery = query(collection(db, "tasks"), where("status", "==", "active"));
        const auditQuery = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(20));

        const [membersSnap, auditSnap] = await Promise.all([
          getDocs(memberQuery),
          getDocs(auditQuery)
        ]);

        setStats(prev => ({ ...prev, members: membersSnap.size }));
        const auditData = auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogDoc));
        setLogs(Array.isArray(auditData) ? auditData : []);
        
        const memberList = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDoc));
        setMembers(memberList);

        const healthStatus = await getSystemHealth();
        setHealth(healthStatus);
      } catch (err) {
        console.error("Admin data fetch failed:", err);
        setHealth({ status: "Issues detected", details: "Permission denied or network error" });
      }
    }
    
    if (me?.role === 'admin') {
      fetchAdminData();
    }

    // Simplified query to avoid composite index requirements
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, 
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc));
        const filtered = docs.filter(t => ["active", "pending", "approved", "rejected"].includes(t.status));
        setAllTasks(filtered);
        setStats(prev => ({ ...prev, activeTasks: filtered.filter(t => t.status === 'active').length }));
      },
      (err) => console.error("Task listener failed:", err)
    );

    return () => unsub();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;

    const assignedUids = form.assignedTo === "both" 
      ? members.map(m => m.uid) 
      : [form.assignedTo];

    await adminCreateTask({
      ...form,
      assignedTo: assignedUids,
      expiresAt: form.expiry ? Timestamp.fromDate(new Date(form.expiry)) : undefined,
      coupleId: members[0]?.coupleId || "",
      createdBy: me.uid,
    } as any, me.displayName);
    setForm({ title: "", description: "", type: "daily", assignedTo: "both", pointReward: 5, expiry: "" });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-nunito bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white">
          <Shield size={24} />
        </div>
        <h1 className="text-2xl font-black text-slate-800">Admin Command</h1>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200">
        {["overview", "tasks", "audit"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`pb-2 text-sm font-bold capitalize ${tab === t ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-none shadow-sm">
            <div className="p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Members</div>
              <div className="text-3xl font-black text-indigo-600 mt-1">{stats.members}</div>
            </div>
          </Card>
          <Card className="bg-white border-none shadow-sm">
            <div className="p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Tasks</div>
              <div className="text-3xl font-black text-rose-500 mt-1">{stats.activeTasks}</div>
            </div>
          </Card>
          <Card className="bg-emerald-50 border-emerald-100 border shadow-sm">
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">System Health</div>
                <div className="text-lg font-black text-emerald-700 mt-1">{health.status}</div>
                <div className="text-[10px] text-emerald-600 font-bold">{health.details}</div>
              </div>
              <Activity className="text-emerald-500" />
            </div>
          </Card>
        </div>
      )}

      {tab === "tasks" && (
        <Card className="p-6">
          <CardHeader title="Task Manager" subtitle="Create and assign new challenges" />
          <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
            <input
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200"
              placeholder="Task Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1">ASSIGN TO</label>
                <select 
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                >
                  <option value="both">Both Members</option>
                  {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.nickname || m.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1">TASK TYPE</label>
                <select 
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  <option value="daily">Daily</option>
                  <option value="long-term">Long-term</option>
                  <option value="surprise">Surprise</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1">REWARD (PTS)</label>
              <input 
                type="number"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                value={form.pointReward}
                onChange={(e) => setForm({ ...form, pointReward: Number(e.target.value) })}
              />
              </div>
              {form.type === 'long-term' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">EXPIRY DATE</label>
                  <input 
                    type="datetime-local"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                    value={form.expiry}
                    onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                  />
                </div>
              )}
            </div>
            <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <PlusCircle size={18} /> Create Task
            </button>
          </form>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Pts</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Array.isArray(allTasks) && allTasks.map(task => (
                  <tr key={task.id} className="text-slate-600">
                    <td className="py-4 font-bold truncate max-w-[150px]">{task.title}</td>
                    <td className="py-4 capitalize">{task.type}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${task.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-4">{task.pointReward}</td>
                    <td className="py-4 text-right space-x-2">
                      <button onClick={() => adminArchiveTask(task.id, me?.displayName || 'Admin')} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Archive size={16} />
                      </button>
                      <button onClick={() => adminDeleteTask(task.id, me?.displayName || 'Admin')} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "audit" && (
        <Card className="p-6">
          <CardHeader title="System Audit" subtitle="Live feed of system events" />
          <div className="space-y-4 mt-4">
            {logs.map(log => (
              <div key={log.id} className="flex gap-4 text-sm border-b border-slate-50 pb-3 last:border-0">
                <div className="text-slate-400 font-mono text-[10px] w-20">
                  {/* Safe check for serverTimestamp which is null on first local sync */}
                  {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-700">{log.actor}</span>
                  <p className="text-slate-500 mt-0.5">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}