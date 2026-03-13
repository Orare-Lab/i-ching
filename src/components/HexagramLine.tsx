import { motion } from "motion/react";
import { LineValue } from "../data/hexagrams";
import { cn } from "../lib/utils";

interface HexagramLineProps {
  value: LineValue;
  index: number;
}

export function HexagramLine({ value, index }: HexagramLineProps) {
  const isYang = value === 7 || value === 9;
  const isMoving = value === 6 || value === 9;

  // 确定爻名 (初九、六二、九三、六四、九五、上六)
  const yinYangChar = isYang ? "九" : "六";
  const positionChar = index === 5 ? "上" : index === 0 ? "初" : ["二", "三", "四", "五"][index - 1];
  const label = index === 0 || index === 5 
    ? `${positionChar}${yinYangChar}` 
    : `${yinYangChar}${positionChar}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-[280px] sm:max-w-[320px] my-1.5 sm:my-2 group"
    >
      <div className="text-zinc-400 font-serif text-sm sm:text-base w-8 sm:w-10 text-right opacity-80 group-hover:opacity-100 transition-opacity tracking-widest">
        {label}
      </div>
      
      <div className="flex-1 flex items-center justify-center h-6 sm:h-8">
        {isYang ? (
          <div className={cn(
            "w-full h-3 sm:h-4 transition-all duration-500",
            isMoving ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
          )} />
        ) : (
          <div className="w-full h-3 sm:h-4 flex justify-between">
            <div className={cn(
              "w-[42%] h-full transition-all duration-500",
              isMoving ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            )} />
            <div className={cn(
              "w-[42%] h-full transition-all duration-500",
              isMoving ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            )} />
          </div>
        )}
      </div>

      <div className={cn(
        "text-base sm:text-lg w-6 sm:w-8 font-serif font-bold transition-colors duration-500 text-left",
        isMoving ? "text-amber-500" : "text-transparent"
      )}>
        {isMoving && (value === 9 ? "○" : "×")}
      </div>
    </motion.div>
  );
}
