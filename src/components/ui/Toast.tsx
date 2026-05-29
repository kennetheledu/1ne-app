import { cn } from "../../utils/cn";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";

export type ToastKind = "success" | "error" | "info";

export function Toast({
  kind,
  message,
  onClose,
}: {
  kind: ToastKind;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles: Record<ToastKind, string> = {
    success: "bg-mint-100 border-mint-300 text-emerald-700",
    error: "bg-rose-100 border-rose-300 text-rose-700",
    info: "bg-lavender-100 border-lavender-300 text-violet-700",
  };
  const Icon = kind === "success" ? CheckCircle2 : kind === "error" ? AlertCircle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={cn(
        "fixed top-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-2xl border-2 shadow-cute flex items-center gap-2 max-w-[90vw] backdrop-blur-md",
        styles[kind]
      )}
    >
      <Icon size={18} />
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </motion.div>
  );
}
