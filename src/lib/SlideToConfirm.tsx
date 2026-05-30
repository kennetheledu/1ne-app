"use client";
import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";

export function SlideToConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(x, [0, 200], ["#fce7f3", "#ec4899"]);
  const opacity = useTransform(x, [0, 150], [1, 0]);

  const handleDragEnd = () => {
    if (x.get() > 180) {
      setIsConfirmed(true);
      onConfirm();
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative w-full h-14 rounded-full overflow-hidden bg-rose-50 border border-rose-100 shadow-inner">
      <motion.div style={{ background }} className="absolute inset-0 flex items-center justify-center">
        <motion.span style={{ opacity }} className="text-xs font-bold text-rose-400 uppercase tracking-widest">
          Slide to Accept
        </motion.span>
      </motion.div>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 200 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="absolute left-1 top-1 w-12 h-12 rounded-full bg-white shadow-soft flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
      >
        {isConfirmed ? <Check className="text-emerald-500" /> : <ChevronRight className="text-rose-500" />}
      </motion.div>
      
      {isConfirmed && (
        <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
          Accepted!
        </div>
      )}
    </div>
  );
}