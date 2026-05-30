"use client";
import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "../lib/firebaseClient";
import { useMe } from "../lib/useMe";
import { ThreadDoc, MessageDoc } from "./firebaseTypes";
import { Card } from "../components/ui/Card";
import { MessageCircle, Gift, Heart, Send, ChevronLeft } from "lucide-react";
import { cn } from "../utils/cn";
import { motion, AnimatePresence } from "framer-motion";

export function Threads() {
  const me = useMe();
  const [threads, setThreads] = useState<ThreadDoc[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadDoc | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!me?.uid) return;
    const q = query(collection(db, "threads"), where("participants", "array-contains", me.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ThreadDoc));
      setThreads(data);
      // Update selected thread if it changes in background
      if (selectedThread) {
        const updated = data.find(t => t.id === selectedThread.id);
        if (updated) setSelectedThread(updated);
      }
    });
    return () => unsub();
  }, [me?.uid]);

  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "threads", selectedThread.id, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageDoc)));
    });
    return () => unsub();
  }, [selectedThread]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedThread || !me) return;
    
    await addDoc(collection(db, "threads", selectedThread.id, "messages"), {
      senderUid: me.uid,
      text: input.trim(),
      timestamp: serverTimestamp(),
      reactions: {}
    });
    setInput("");
  };

  if (selectedThread) {
    return (
      <div className="flex flex-col h-screen bg-white font-nunito">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <button onClick={() => setSelectedThread(null)} className="p-2 -ml-2 text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-black text-slate-800 truncate">{selectedThread.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col", msg.senderUid === me?.uid ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-2xl text-sm font-bold",
                msg.senderUid === me?.uid ? "bg-indigo-500 text-white rounded-tr-none shadow-cute" : "bg-slate-100 text-slate-700 rounded-tl-none"
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-300 font-bold mt-1 px-1 uppercase tracking-tighter">
                {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-2">
          <input
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-300"
            placeholder="Say something sweet..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="p-3 bg-indigo-500 text-white rounded-2xl shadow-cute active:scale-95 transition-transform">
            <Send size={20} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 font-nunito bg-indigo-50 min-h-screen pb-24">
      <header className="px-2 pt-4">
        <h1 className="text-2xl font-black text-slate-800">Messages</h1>
        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Discussions & History</p>
      </header>

      <div className="space-y-3">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} onClick={() => setSelectedThread(thread)} />
        ))}
        {threads.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-soft flex items-center justify-center mb-4 -rotate-6">
              <MessageCircle className="text-indigo-200" size={32} />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Silence is golden</p>
            <p className="text-xs text-slate-300 font-bold mt-1 px-8 text-center">Threads will appear here when you submit tasks or request favors.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadCard({ thread, onClick }: { thread: ThreadDoc, onClick: () => void }) {
  const isTask = thread.type === "task";

  return (
    <Card onClick={onClick} className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors border-none shadow-soft active:scale-[0.98]">
      <div className={cn(
        "p-3 rounded-2xl shrink-0",
        isTask ? "bg-rose-100 text-rose-500" : "bg-indigo-100 text-indigo-500"
      )}>
        {isTask ? <Gift size={20} /> : <Heart size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-black text-slate-800 truncate pr-2">{thread.title}</h3>
        </div>
        <p className="text-xs text-slate-400 font-bold mt-0.5 truncate uppercase tracking-tighter">
          Discussion thread
        </p>
      </div>
    </Card>
  );
}