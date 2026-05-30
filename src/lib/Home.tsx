"use client";
import React, { useEffect, useState } from "react";
import { useMe } from "../lib/useMe";
import { getWalletData } from "../lib/firebaseCallables";
import { db } from "../lib/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Card } from "../components/ui/Card";
import { WalletDoc, TaskDoc } from "./firebaseTypes";
import { CheckCircle, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function Home() {
  const me = useMe();
  const [wallet, setWallet] = useState<WalletDoc | null>(null);
  const [activeTasks, setActiveTasks] = useState<number>(0);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  useEffect(() => {
    if (!me?.uid) return;
    getWalletData(me.uid).then(setWallet);

    const tasksQuery = query(collection(db, "tasks"), where("assignedTo", "array-contains", me.uid));
    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      const all = snap.docs.map(d => d.data() as TaskDoc);
      setActiveTasks(all.filter(t => t.status === 'active' || t.status === 'rejected').length);
      setPendingApprovals(all.filter(t => t.status === 'pending' && t.assignedTo[0] !== me.uid).length);
    });

    return () => unsubTasks();
  }, [me?.uid]);

  const capUsed = wallet?.monthlyRedeemed || 0;

  return (
    <div className="p-6 space-y-6 font-nunito bg-lavender-50 min-h-screen pb-24">
      <header>
        <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">Welcome Back</p>
        <h1 className="text-3xl font-black text-slate-800">{me?.nickname || me?.displayName} ✨</h1>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <Link to="/tasks">
          <Card className="p-4 bg-white border-none shadow-soft flex flex-col items-center justify-center text-center active:scale-95 transition-transform h-full">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500 mb-2">
              <Clock size={20} />
            </div>
            <div className="text-2xl font-black text-slate-800">{activeTasks}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tasks</div>
          </Card>
        </Link>

        <Link to="/tasks">
          <Card className="p-4 bg-white border-none shadow-soft flex flex-col items-center justify-center text-center active:scale-95 transition-transform h-full">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500 mb-2">
              <CheckCircle size={20} />
            </div>
            <div className="text-2xl font-black text-slate-800">{pendingApprovals}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To Review</div>
          </Card>
        </Link>
      </section>

      <Card className="p-6 bg-white border-none shadow-soft">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" fill="currentColor" />
              Monthly Cap
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{capUsed}/100 Used</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-rose-500">{Math.max(0, 100 - capUsed)}</span>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Remaining</span>
          </div>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${capUsed}%` }}
            className="h-full bg-gradient-to-r from-rose-400 to-pink-400"
          />
        </div>
      </Card>

      <section className="pt-2">
        <Link to="/favors" className="block w-full p-4 bg-indigo-500 text-white rounded-[20px] font-black text-sm flex items-center justify-between shadow-cute active:scale-[0.98] transition-transform">
          <span>Request a Favor</span>
          <Zap size={18} />
        </Link>
      </section>
    </div>
  );
}