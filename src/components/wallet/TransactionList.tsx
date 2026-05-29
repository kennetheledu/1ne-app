import { ArrowDownLeft, ArrowUpRight, Flame, History } from "lucide-react";
import { cn } from "../../utils/cn";
import type { TransactionDoc } from "../../lib/firebase";

export function TransactionList({
  transactions,
  emptyLabel = "No transactions yet.",
}: {
  transactions: TransactionDoc[];
  emptyLabel?: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-7 text-sm text-gray-400">
        <History className="mx-auto mb-2 opacity-40" size={22} />
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {transactions.map((txn) => {
        const tone =
          txn.kind === "award"
            ? "emerald"
            : txn.kind === "redeem"
            ? "rose"
            : txn.kind === "decay"
            ? "orange"
            : "violet";
        const Icon =
          txn.kind === "award"
            ? ArrowUpRight
            : txn.kind === "redeem"
            ? ArrowDownLeft
            : txn.kind === "decay"
            ? Flame
            : History;

        return (
          <li
            key={txn.id}
            className="flex items-start gap-3 p-3 rounded-2xl border border-rose-100 bg-white/70"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                tone === "emerald" && "bg-mint-100 text-emerald-700",
                tone === "rose" && "bg-rose-100 text-rose-700",
                tone === "orange" && "bg-amber-100 text-orange-700",
                tone === "violet" && "bg-lavender-100 text-violet-700"
              )}
            >
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-rose-700 truncate">{txn.reason}</div>
                <div
                  className={cn(
                    "text-sm font-extrabold shrink-0",
                    txn.delta > 0 && "text-emerald-600",
                    txn.delta < 0 && "text-rose-600",
                    txn.delta === 0 && "text-violet-600"
                  )}
                >
                  {txn.delta > 0 ? "+" : txn.delta < 0 ? "-" : "±"}
                  {Math.abs(txn.delta)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1 text-[11px] text-gray-500 font-semibold">
                <span className="uppercase tracking-wide">{txn.kind}</span>
                <span>Balance after: {txn.balanceAfter}</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {new Date(txn.createdAt).toLocaleString()}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
