import { CalendarClock } from "lucide-react";
import type { MonthlySnapshotDoc } from "../../lib/firebase";

export function SnapshotList({ snapshots }: { snapshots: MonthlySnapshotDoc[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="text-center py-7 text-sm text-gray-400">
        <CalendarClock className="mx-auto mb-2 opacity-40" size={22} />
        No monthly snapshots yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {snapshots.map((snap) => (
        <li
          key={snap.id}
          className="rounded-2xl border border-lavender-100 bg-lavender-50/70 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-violet-700">{labelForMonth(snap.monthKey)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Open {snap.openingBalance} · Earned {snap.earned} · Redeemed {snap.redeemed}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-orange-700">-{snap.decayed} decay</div>
              <div className="text-[11px] text-gray-500">Close {snap.closingBalance}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function labelForMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}
