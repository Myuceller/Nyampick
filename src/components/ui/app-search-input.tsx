import { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
}

export function AppSearchInput({
  value,
  onChange,
  wrapperClassName,
  inputClassName,
  iconClassName,
  ...props
}: AppSearchInputProps) {
  return (
    <label className={cn("relative block", wrapperClassName)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#95a09c]",
          iconClassName
        )}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-12 w-full rounded-[15px] border border-[#e3e5e4] bg-[#eef0ef] pl-12 pr-4 text-[16px] text-[#2a312f] outline-none placeholder:text-[#8b9591] focus:border-[#6bc8a0]",
          inputClassName
        )}
        {...props}
      />
    </label>
  );
}
