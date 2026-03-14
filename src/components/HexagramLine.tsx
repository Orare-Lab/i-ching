import { motion } from "motion/react";
import { HexagramLineDetail } from "../data/hexagrams";
import { cn } from "../lib/utils";

interface HexagramLineProps {
  line: HexagramLineDetail;
}

export function HexagramLine({ line }: HexagramLineProps) {
  const { index, isYang, isMoving, label, marker, annotation } = line;

  const sixRelative = annotation.sixRelative ?? "待定";
  const sixSpirit = annotation.sixSpirit ?? "待定";
  const naJia = annotation.earthlyBranch && annotation.element ? `${annotation.earthlyBranch}${annotation.element}` : "待定";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="grid w-full max-w-[22.5rem] grid-cols-[2.5rem_minmax(0,1fr)_2.8rem_2.8rem_3rem] items-center gap-1.5 px-1 sm:max-w-[29rem] sm:grid-cols-[3rem_minmax(0,1fr)_3.5rem_3.5rem_3.75rem] sm:gap-2 my-1.5 sm:my-2 group"
    >
      <div className="text-stone-500 font-serif text-sm sm:text-base text-right opacity-80 group-hover:opacity-100 transition-opacity tracking-widest">
        {label}
      </div>
      
      <div className="flex h-6 sm:h-8 items-center justify-center gap-2 sm:gap-2.5">
        {isYang ? (
          <div className={cn(
            "w-28 sm:w-32 h-3 sm:h-4 transition-all duration-500",
            isMoving ? "bg-[#8b2b22] shadow-[0_0_15px_rgba(139,43,34,0.4)]" : "bg-stone-700 shadow-sm"
          )} />
        ) : (
          <div className="w-28 sm:w-32 h-3 sm:h-4 flex justify-between">
            <div className={cn(
              "w-[42%] h-full transition-all duration-500",
              isMoving ? "bg-[#8b2b22] shadow-[0_0_15px_rgba(139,43,34,0.4)]" : "bg-stone-700 shadow-sm"
            )} />
            <div className={cn(
              "w-[42%] h-full transition-all duration-500",
              isMoving ? "bg-[#8b2b22] shadow-[0_0_15px_rgba(139,43,34,0.4)]" : "bg-stone-700 shadow-sm"
            )} />
          </div>
        )}
        <div className={cn(
          "w-3 text-xs sm:w-4 sm:text-sm font-serif font-bold transition-colors duration-500 text-center",
          isMoving ? "text-[#8b2b22]" : "text-transparent"
        )}>
          {marker}
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border px-1.5 py-1 text-center font-serif text-[10px] sm:text-[11px]",
          annotation.sixRelative ? "border-[#8b2b22]/20 bg-[#8b2b22]/6 text-[#8b2b22]" : "border-stone-200 bg-stone-50/80 text-stone-400",
        )}
      >
        {sixRelative}
      </div>

      <div
        className={cn(
          "rounded-lg border px-1.5 py-1 text-center font-serif text-[10px] sm:text-[11px]",
          annotation.sixSpirit ? "border-stone-200 bg-white/80 text-stone-700" : "border-stone-200 bg-stone-50/80 text-stone-400",
        )}
      >
        {sixSpirit}
      </div>

      <div
        className={cn(
          "rounded-lg border px-1.5 py-1 text-center font-serif text-[10px] sm:text-[11px]",
          annotation.earthlyBranch && annotation.element ? "border-stone-200 bg-white/80 text-stone-700" : "border-stone-200 bg-stone-50/80 text-stone-400",
        )}
      >
        {naJia}
      </div>
    </motion.div>
  );
}
