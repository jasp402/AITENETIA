"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

export function ActionIconButton({
  label,
  onClick,
  icon: Icon,
  disabled,
  badge,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/65 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:border-white/6 disabled:bg-white/[0.02] disabled:text-white/25"
        >
          <Icon size={16} />
          {typeof badge === "number" ? (
            <span className="absolute -right-1 -top-1 rounded-full border border-[#0b0b10] bg-primary px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
              {badge}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
