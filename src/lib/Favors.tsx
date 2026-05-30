"use client";
import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebaseClient";
import { useMe } from "../lib/useMe";
import { FavorDoc } from "./firebaseTypes";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { approveFavor, rejectFavor, counterFavor, startFavorRequest } from "../lib/firebaseCallables";
import { cn } from "../utils/cn";
import { MessageSquare, Zap, XCircle, CheckCircle, Plus, X, Clock, Heart, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../context/ToastContext";

export function Favors() {
  const me = useMe();
  const [favors, setFavors] = useState<FavorDoc[]>([]);
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", proposedCost: 10 });
  const { showToast } = useToast();

  useEffect(() => {
    if (!me?.uid) return;
    const q = query(collection(db, "favorRequests"), where("coupleId", "==", me.coupleId));
    const unsub = onSnapshot(q, (snap) => {
      setFavors(snap.docs.map(d => ({ id: d.id, ...d.data() } as FavorDoc)));
    });
    return () => unsub();
  }, [me?.uid, me?.coupleId]);

  // Turn-based filtering logic (3-Strike Rule)
  const isMyTurn = (f: FavorDoc) => {
    if (f.status === 'rejected' || f.status === 'agreed') return false;
    const isReceiver = f.toUid === me?.uid;
    const isRequester = f.fromUid === me?.uid;
    
    // Round 1: Receiver's turn to respond to initial request
    if (f.currentRound === 1 && isReceiver) return true;
    // Round 2: Requester's turn to respond to partner's counter
    if (f.currentRound === 2 && isRequester) return true;
    // Round 3: Receiver's turn to respond to final counter back
    if (f.currentRound === 3 && isReceiver) return true;
    
    return false;
  };

  const incoming = favors.filter(isMyTurn);
  const outgoing = favors.filter(f => f.fromUid === me?.uid);

  const handleCreate = async () => {
    if (!me || !me.partnerId || !me.coupleId) return;
    try {
      await startFavorRequest({
        title: form.title,
        description: form.description,
        proposedCost: form.proposedCost,
        fromUid: me.uid,
        toUid: me.partnerId,
        coupleId: me.coupleId,
      }, me.displayName);
      showToast("Favor request sent! 🚀");
      setShowNewModal(false);
      setForm({ title: "", description: "", proposedCost: 10 });
    } catch (e) {
      console.error("Failed to start favor:", e);
      showToast("Failed to send favor", "error");
    }
  };

  return (
    <div className="p-4 space-y-4 font-nunito bg-pink-50 min-h-screen pb-24">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black text-rose-600">Favors</h1>
        <button 
          onClick={() => setShowNewModal(true)}
          className="p-3 bg-rose-500 text-white rounded-2xl shadow-cute active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-white/50 rounded-2xl border border-white">
        <button onClick={() => setTab("incoming")} className={cn("flex-1 py-2 text-xs font-black rounded-xl", tab === "incoming" ? "bg-rose-500 text-white" : "text-rose-400")}>
          Incoming ({incoming.length})
        </button>
        <button onClick={() => setTab("outgoing")} className={cn("flex-1 py-2 text-xs font-black rounded-xl", tab === "outgoing" ? "bg-rose-500 text-white" : "text-rose-400")}>
          My Requests
        </button>
      </div>

      <div className="space-y-4">
        {(tab === "incoming" ? incoming : outgoing).map(favor => (
          <FavorCard key={favor.id} favor={favor} isIncoming={tab === "incoming"} />
        ))}
        {(tab === "incoming" ? incoming : outgoing).length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-soft flex items-center justify-center mb-4 rotate-3">
              <Heart size={32} className="text-rose-300 fill-rose-50" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No favors here</p>
            <p className="text-xs text-slate-300 font-bold mt-1 px-8 text-center">
              {tab === "incoming" ? "Your partner hasn't requested anything yet. Lucky you!" : "Request a little favor from your partner to get started!"}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowNewModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800">New Favor</h2>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400"><X /></button>
              </div>
              <div className="space-y-3">
                <input 
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold"
                  placeholder="Title (e.g. Foot Rub)"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                />
                <textarea 
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold h-24"
                  placeholder="Details..."
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Proposed Cost (Pts)</label>
                  <input 
                    type="number"
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold"
                    value={form.proposedCost}
                    onChange={e => setForm({...form, proposedCost: Number(e.target.value)})}
                  />
                </div>
                <Button fullWidth className="bg-rose-500 text-white py-4 rounded-2xl shadow-cute" onClick={handleCreate}>
                  Send Request
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FavorCard({ favor, isIncoming }: { favor: FavorDoc; isIncoming: boolean }) {
  const me = useMe();
  
  const isReceiver = favor.toUid === me?.uid;
  const isRequester = favor.fromUid === me?.uid;
  
  const isMyTurn = 
    (favor.currentRound === 1 && isReceiver) ||
    (favor.currentRound === 2 && isRequester) ||
    (favor.currentRound === 3 && isReceiver);

  const canCounter = favor.currentRound < 3;
  const [showCounter, setShowCounter] = useState(false);
  const [counterVal, setCounterVal] = useState(favor.proposedCost);

  const handleCounter = async () => {
    if (!me) return;
    await counterFavor(favor.id, counterVal, me.displayName);
    setShowCounter(false);
  };

  return (
    <Card className="p-5 border-none shadow-soft">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-black text-slate-800">{favor.title}</h3>
        <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-1 rounded-lg uppercase">
          Round {favor.currentRound}/3
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">{favor.description}</p>
      
      <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <Zap size={16} className="text-amber-500" />
        <span className="text-sm font-black text-slate-700">Cost: {favor.proposedCost} Points</span>
      </div>

      {isIncoming && favor.status !== "agreed" && (
        <div className="space-y-3">
          {showCounter ? (
            <div className="flex gap-2">
              <input 
                type="number" 
                className="flex-1 bg-white border border-rose-100 rounded-xl px-3 text-sm font-bold" 
                value={counterVal}
                onChange={(e) => setCounterVal(Number(e.target.value))}
              />
              <Button size="sm" onClick={handleCounter}>Send</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCounter(false)}>X</Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 px-0" onClick={() => approveFavor(favor.id, me?.displayName || "")}>
                <CheckCircle size={16} />
              </Button>
              {canCounter && (
                <Button className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2 px-0" onClick={() => setShowCounter(true)}>
                  <MessageSquare size={16} />
                </Button>
              )}
              <Button className="bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl py-2 px-0 border-none shadow-none" onClick={() => rejectFavor(favor.id, me?.displayName || "")}>
                <XCircle size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}