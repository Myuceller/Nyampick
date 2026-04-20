import { cn } from "@/lib/utils";

interface ChipOption {
  key: string;
  label: string;
}

interface CategoryChipFilterProps {
  options: ChipOption[];
  activeKey: string;
  onChange: (key: string) => void;
  containerClassName?: string;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function CategoryChipFilter({
  options,
  activeKey,
  onChange,
  containerClassName,
  buttonClassName,
  activeClassName,
  inactiveClassName,
}: CategoryChipFilterProps) {
  return (
    <div className={cn("no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1", containerClassName)}>
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-[16px] font-semibold",
              isActive
                ? "border-[#57bf8e] bg-[#57bf8e] text-white"
                : "border-[#c6cecb] bg-white text-[#69726f]",
              isActive ? activeClassName : inactiveClassName,
              buttonClassName
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
