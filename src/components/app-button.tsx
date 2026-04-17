import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  bgClassName?: string;
  textClassName?: string;
}

export function AppButton({
  label,
  bgClassName,
  textClassName,
  className,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl text-[18px] font-semibold transition duration-100 active:scale-[0.98] active:brightness-95 disabled:opacity-60 after:pointer-events-none after:absolute after:inset-0 after:bg-white/30 after:opacity-0 after:transition-opacity after:duration-150 active:after:opacity-100",
        bgClassName ?? "bg-[#57bf8e]",
        textClassName ?? "text-white",
        className
      )}
      {...props}
    >
      <span className="relative z-[1]">{label}</span>
    </button>
  );
}
