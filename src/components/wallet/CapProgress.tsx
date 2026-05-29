import { cn } from "../../utils/cn";

export function CapProgress({
  used,
  cap,
  className,
}: {
  used: number;
  cap: number;
  className?: string;
}) {
  const percent = cap === 0 ? 0 : Math.min(100, (used / cap) * 100);
  const remaining = Math.max(0, cap - used);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-rose-500">Monthly redemption cap</span>
        <span className="text-gray-500">
          {used}/{cap} used · {remaining} left
        </span>
      </div>
      <div className="h-3 rounded-full bg-rose-100 overflow-hidden border border-rose-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
