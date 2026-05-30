"use client";
import React, { useEffect, useState } from "react";
import { useMe } from "../lib/useMe";
import { Card } from "../components/ui/Card";
import { User, LogOut, Calendar, Award, Edit3, Check, X, ShieldCheck, Heart } from "lucide-react";
import { auth } from "../lib/firebaseClient";
import { signOut } from "firebase/auth";
import { getStreakData, updateNickname, getPartnerData } from "./firebaseCallables";
import { StreakDoc, UserDoc } from "../pages/firebaseTypes";
import { useToast } from "./ToastContext";
import { resetPassword } from "./firebaseAuth";

export function Profile() {
  const me = useMe();
  const { showToast } = useToast();
  const [streak, setStreak] = useState<StreakDoc | null>(null);
  const [partner, setPartner] = useState<UserDoc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.uid) {
      getStreakData(me.uid).then(setStreak);
      if (me.partnerId) {
        getPartnerData(me.partnerId).then(setPartner);
      }
      setNewNickname(me.nickname || "");
    }
  }, [me?.uid, me?.partnerId, me?.nickname]);

  const handleLogout = () => signOut(auth);

  const handleUpdateNickname = async () => {
    if (!me || !newNickname.trim()) return;
    setBusy(true);
    try {
      await updateNickname(me.uid, newNickname.trim(), me.displayName);
      showToast("Nickname updated! ✨");
      setIsEditing(false);
    } catch (err) {
      showToast("Failed to update nickname", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!me?.email) return;
    try {
      await resetPassword(me.email);
      showToast("Password reset email sent! 📧", "info");
    } catch (err) {
      showToast("Failed to send reset email", "error");
    }
  };

  return (
    <div className="p-6 space-y-6 font-nunito bg-slate-50 min-h-screen pb-24">
      <div className="flex flex-col items-center text-center pt-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 p-1 mb-4 shadow-xl">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl font-black text-rose-500">
            {me?.nickname?.charAt(0) || me?.displayName?.charAt(0) || "👤"}
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2 mt-2">
            <input 
              className="bg-white border border-rose-100 rounded-xl px-4 py-2 text-center font-black text-slate-800 shadow-sm focus:outline-none focus:ring-2 ring-rose-300"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              disabled={busy}
              autoFocus
            />
            <button onClick={handleUpdateNickname} className="p-2 bg-emerald-500 text-white rounded-xl shadow-cute"><Check size={18} /></button>
            <button onClick={() => setIsEditing(false)} className="p-2 bg-rose-100 text-rose-500 rounded-xl"><X size={18} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
            <h1 className="text-2xl font-black text-slate-800">{me?.nickname || me?.displayName}</h1>
            <Edit3 size={16} className="text-slate-300 group-hover:text-rose-400 transition-colors" />
          </div>
        )}
        
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{me?.role}</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4 border-none shadow-soft flex items-center gap-4">
          <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
            <User size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Partner</p>
            <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
              {partner ? partner.nickname || partner.displayName : "No partner linked"}
              {partner && <Heart size={12} className="text-rose-400 fill-current" />}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-soft flex items-center gap-4">
          <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
            <Award size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Streak</p>
            <p className="text-sm font-bold text-slate-700">
              {streak ? `${streak.current} Days` : "No active streak"}
              {streak && streak.longest > streak.current && <span className="text-[10px] text-slate-300 ml-2">(Best: {streak.longest})</span>}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-soft flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
            <Calendar size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Member Since</p>
            <p className="text-sm font-bold text-slate-700">May 2026</p>
          </div>
        </Card>
      </div>

      <div className="pt-4 space-y-3">
        <button onClick={handleChangePassword} className="w-full p-4 bg-white text-indigo-500 border border-indigo-100 rounded-[20px] font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
          <ShieldCheck size={18} /> Change Password
        </button>
        
        <button onClick={handleLogout} className="w-full p-4 bg-white text-rose-500 border border-rose-100 rounded-[20px] font-black text-sm flex items-center justify-center gap-2 shadow-sm">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
}