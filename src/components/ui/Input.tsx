import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-rose-600 mb-1.5 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-12 px-4 rounded-2xl bg-white/80 border-2 border-rose-100 text-gray-800 placeholder:text-gray-400 outline-none transition-all",
              "focus:border-rose-300 focus:bg-white focus:shadow-cute",
              error && "border-rose-400",
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="mt-1.5 ml-1 text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 ml-1 text-xs text-rose-500 font-semibold">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
