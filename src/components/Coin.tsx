import { useSpring, animated, config } from "@react-spring/web";
import { useEffect, useRef } from "react";

interface CoinProps {
  value: 0 | 1; // 0 for heads (front), 1 for tails (back)
  tossRound: number;
  delay?: number;
}

export function Coin({ value, tossRound, delay = 0 }: CoinProps) {
  // 记录总旋转角度，确保每次摇卦都是向前翻转，不会倒转
  const totalRotation = useRef(value === 1 ? 180 : 0);
  const lastAnimatedSignature = useRef("0-initial");

  const [{ rotateX, y, scale }, api] = useSpring(() => ({
    rotateX: totalRotation.current,
    y: 0,
    scale: 1,
    config: config.stiff,
  }));

  useEffect(() => {
    const signature = `${tossRound}-${value}`;
    if (tossRound <= 0 || signature === lastAnimatedSignature.current) {
      return;
    }

    lastAnimatedSignature.current = signature;

    const currentBase = Math.floor(totalRotation.current / 360) * 360;
    const spins = 1800;
    const nextRotation = currentBase + spins + (value === 1 ? 180 : 0);
    totalRotation.current = nextRotation;

    api.stop();
    api.start({
      from: { y: 0, scale: 1 },
      to: async (next) => {
        api.start({
          rotateX: nextRotation,
          config: { mass: 1, tension: 120, friction: 20 },
          delay: delay * 1000,
        });

        await next({ y: -160, scale: 1.2, config: { mass: 1, tension: 180, friction: 25 }, delay: delay * 1000 });
        await next({ y: 0, scale: 1, config: { mass: 1, tension: 300, friction: 20 } });
        await next({ y: -30, config: { mass: 1, tension: 400, friction: 15 } });
        await next({ y: 0, config: { mass: 1, tension: 500, friction: 20 } });
        await next({ y: -10, config: { mass: 1, tension: 600, friction: 15 } });
        await next({ y: 0, config: { mass: 1, tension: 600, friction: 20 } });
      },
    });
  }, [tossRound, value, api, delay]);

  useEffect(() => {
    if (tossRound !== 0) {
      return;
    }

    const targetRotation = value === 1 ? 180 : 0;
    totalRotation.current = targetRotation;
    lastAnimatedSignature.current = "0-initial";
    api.stop();
    api.start({
      rotateX: targetRotation,
      y: 0,
      scale: 1,
      config: config.stiff,
    });
  }, [tossRound, value, api]);

  // --- Styling Constants ---
  const holeSize = 24; 
  const edgeSize = (100 - holeSize) / 2; // 38

  const coinMaskStyle = {
    WebkitMaskImage: `
      linear-gradient(black, black),
      linear-gradient(black, black),
      linear-gradient(black, black),
      linear-gradient(black, black)
    `,
    WebkitMaskPosition: 'top, bottom, left, right',
    WebkitMaskSize: `100% ${edgeSize}%, 100% ${edgeSize}%, ${edgeSize}% 100%, ${edgeSize}% 100%`,
    WebkitMaskRepeat: 'no-repeat',
    maskImage: `
      linear-gradient(black, black),
      linear-gradient(black, black),
      linear-gradient(black, black),
      linear-gradient(black, black)
    `,
    maskPosition: 'top, bottom, left, right',
    maskSize: `100% ${edgeSize}%, 100% ${edgeSize}%, ${edgeSize}% 100%, ${edgeSize}% 100%`,
    maskRepeat: 'no-repeat',
  };

  // Colors matching the provided image (brassy/golden bronze)
  const brassLight = "#e6d099";
  const brassBase = "#c7aa62";
  const brassDark = "#a3853f";
  const brassRecessed = "#856b30";
  const brassShadow = "#4a3a16";

  const raisedStyle = {
    color: brassBase,
    textShadow: `
      -1px -1px 1px rgba(255, 255, 255, 0.6),
      1px 1px 2px rgba(0, 0, 0, 0.8),
      0px 0px 1px rgba(0, 0, 0, 0.9)
    `,
    fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
    fontWeight: 900,
  };

  const renderFace = (isFront: boolean) => (
    <div 
      className="absolute w-full h-full backface-hidden rounded-full"
      style={{ 
        backfaceVisibility: "hidden",
        transform: isFront ? "none" : "rotateX(180deg)",
        filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.5))",
        background: `radial-gradient(circle at 30% 30%, ${brassLight} 0%, ${brassBase} 40%, ${brassDark} 100%)`,
        ...coinMaskStyle
      }}
    >
      {/* Recessed Field */}
      <div 
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '12%', bottom: '12%', left: '12%', right: '12%',
          background: `radial-gradient(circle at 50% 50%, ${brassDark} 0%, ${brassRecessed} 100%)`,
          boxShadow: `inset 0 0 8px ${brassShadow}, inset 1px 1px 4px rgba(0,0,0,0.6)`,
        }}
      />

      {/* Inner Rim (around the hole) */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '34%', bottom: '34%', left: '34%', right: '34%',
          background: `linear-gradient(135deg, ${brassLight} 0%, ${brassBase} 50%, ${brassDark} 100%)`,
          boxShadow: `0 0 3px rgba(0,0,0,0.7), inset -1px -1px 2px rgba(255,255,255,0.5), inset 1px 1px 2px rgba(0,0,0,0.6)`,
        }}
      />

      {/* Outer Rim Bevel */}
      <div className="absolute inset-0 rounded-full border-[2px] border-white/10 pointer-events-none" style={{
        boxShadow: "inset 2px 2px 6px rgba(255,255,255,0.5), inset -2px -2px 6px rgba(0,0,0,0.7)"
      }} />

      {/* Characters */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isFront ? (
          <>
            <span className="absolute top-[12%] text-[1.4rem] sm:text-[1.7rem] leading-none" style={raisedStyle}>乾</span>
            <span className="absolute bottom-[12%] text-[1.4rem] sm:text-[1.7rem] leading-none" style={raisedStyle}>隆</span>
            <span className="absolute right-[13%] text-[1.4rem] sm:text-[1.7rem] leading-none" style={raisedStyle}>通</span>
            <span className="absolute left-[13%] text-[1.4rem] sm:text-[1.7rem] leading-none" style={raisedStyle}>宝</span>
          </>
        ) : (
          <>
            <span className="absolute left-[16%] text-[1.2rem] sm:text-[1.5rem] leading-none" style={{...raisedStyle, writingMode: 'vertical-lr'}}>ᠪᠣᠣ</span>
            <span className="absolute right-[16%] text-[1.2rem] sm:text-[1.5rem] leading-none" style={{...raisedStyle, writingMode: 'vertical-lr'}}>ᠴᡳᡠᠸᠠᠨ</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 perspective-1000">
      <animated.div
        className="w-full h-full relative preserve-3d"
        style={{ 
          transformStyle: "preserve-3d",
          transform: y.to(yVal => `translateY(${yVal}px)`)
            .to(t => `${t} scale(${scale.get()}) rotateX(${rotateX.get()}deg)`),
        }}
      >
        {renderFace(true)}
        {renderFace(false)}
      </animated.div>
    </div>
  );
}
