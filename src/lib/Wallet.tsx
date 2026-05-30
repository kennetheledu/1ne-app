"use client";
import React, { useEffect, useState } from "react";
import { useMe } from "../lib/useMe";
import { WalletDoc, TransactionDoc } from "./firebaseTypes";
import { getWalletData, getTransactions } from "../lib/firebaseCallables";
import { Card } from "../components/ui/Card";
import { Zap, TrendingDown, History, ArrowUpRight, ArrowDownLeft, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

export function Wallet() {
  const me = useMe();
  const [wallet, setWallet] = useState<WalletDoc | null>(null);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me?.uid) return;
    async function fetchWallet() {
      const [wData, tData] = await Promise.all([
        getWalletData(me!.uid),
        getTransactions(me!.uid)
      ]);
      setWallet(wData);
      setTransactions(tData);
      setLoading(false);
    }
    fetchWallet();
  }, [me?.uid]);

  if (loading) return <div className="p-6 animate-pulse bg-slate-50 h-screen" />;

  const capPercentage = Math.min((wallet?.monthlyRedeemed || 0), 100);

  return (
    <div className="p-6 space-y-6 font-nunito bg-slate-50 min-h-screen pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-amber-400 rounded-2xl text-white shadow-cute">
          <Zap size={24} fill="white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800">My Wallet</h1>
      </div>

      <Card className="p-8 bg-gradient-to-br from-amber-400 to-orange-500 text-white border-none shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Balance</p>
          <h2 className="text-5xl font-black mt-2">{wallet?.totalPoints} <span className="text-lg opacity-80 font-bold uppercase">pts</span></h2>
          
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span>MONTHLY REDEMPTION CAP</span>
              <span>{wallet?.monthlyRedeemed} / 100</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${capPercentage}%` }}
                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-sm">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Next Decay</p>
            <p className="text-sm font-bold text-slate-700">20% on the 1st of next month</p>
          </div>
        </Card>
      </div>

      <div className="pt-4">
        <div className="flex items-center gap-2 text-slate-400 mb-4">
          <History size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Transaction History</span>
        </div>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  tx.type === 'earned' ? "bg-emerald-50 text-emerald-500" : 
                  tx.type === 'spent' ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-500"
                )}>
                  {tx.type === 'earned' ? <ArrowUpRight size={18} /> : 
                   tx.type === 'spent' ? <ArrowDownLeft size={18} /> : <RefreshCcw size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{tx.reason}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{tx.timestamp?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              <div className={cn(
                "font-black",
                tx.type === 'earned' ? "text-emerald-500" : "text-rose-500"
              )}>
                {tx.type === 'earned' ? '+' : '-'}{tx.amount}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-slate-300 text-sm py-10">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}