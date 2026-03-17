import { useSpring, animated, config } from "@react-spring/web";
import { useEffect, useRef } from "react";

interface CoinProps {
  value: 0 | 1; // 0 for heads (front), 1 for tails (back)
  tossRound: number;
  delay?: number;
}

export function Coin({ value, tossRound, delay = 0 }: CoinProps) {
  const coinThickness = 6;
  const faceOffset = coinThickness / 2;

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
          config: { duration: 1550, easing: (t: number) => 1 - (1 - t) * (1 - t) * (1 - t) },
          delay: delay * 1000,
        });

        await next({
          y: -160,
          scale: 1.2,
          config: { duration: 520, easing: (t: number) => 1 - Math.pow(1 - t, 3) },
          delay: delay * 1000,
        });
        await next({
          y: 0,
          scale: 1,
          config: { duration: 420, easing: (t: number) => t * t * t },
        });
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

  const edgeStyle = {
    background: `
      conic-gradient(
        from 0deg,
        rgba(96, 72, 26, 0.94) 0deg,
        rgba(146, 116, 51, 0.96) 42deg,
        rgba(88, 65, 22, 0.92) 88deg,
        rgba(167, 136, 67, 0.96) 138deg,
        rgba(78, 57, 20, 0.9) 205deg,
        rgba(154, 124, 57, 0.95) 262deg,
        rgba(98, 74, 28, 0.94) 320deg,
        rgba(96, 72, 26, 0.94) 360deg
      )
    `,
    boxShadow: `
      inset 0 1px 2px rgba(255, 233, 177, 0.22),
      inset 0 -2px 4px rgba(45, 31, 8, 0.52)
    `,
    border: `1px solid ${brassShadow}`,
  };

  const renderFace = (isFront: boolean) => (
    <div 
      className="absolute w-full h-full rounded-full"
      style={{ 
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
          background: "transparent",
          border: `2px solid ${brassBase}`,
          boxShadow: `
            0 0 3px rgba(0,0,0,0.7),
            inset -1px -1px 2px rgba(255,255,255,0.5),
            inset 1px 1px 2px rgba(0,0,0,0.6)
          `,
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

  const renderEdgeLayers = () =>
    Array.from({ length: coinThickness }, (_, index) => {
      const layerDepth = faceOffset - (index + 1);
      const distanceFromCenter = Math.abs(layerDepth);
      const layerBrightness = 0.78 + (1 - distanceFromCenter / faceOffset) * 0.18;

      return (
        <div
          key={`edge-${index}`}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            transform: `translateZ(${layerDepth}px)`,
            filter: `saturate(0.88) brightness(${layerBrightness})`,
            ...coinMaskStyle,
            ...edgeStyle,
          }}
        />
      );
    });

  const idleSpinStyle = tossRound === 0
    ? {
        animation: `coin-idle-axis-spin ${7 + delay * 1.2}s linear infinite`,
        animationDelay: `${delay * -0.8}s`,
        transformStyle: "preserve-3d" as const,
      }
    : undefined;

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 perspective-1000">
      <animated.div
        className="absolute left-1/2 top-[88%] -z-10 rounded-full"
        style={{
          width: "78%",
          height: "16%",
          background: "radial-gradient(circle, rgba(28, 18, 6, 0.38) 0%, rgba(28, 18, 6, 0.18) 45%, rgba(28, 18, 6, 0.02) 100%)",
          transform: y.to((yVal) => {
            const lift = Math.max(0, -yVal);
            const scaleX = Math.max(0.62, 1 - lift / 420);
            const scaleY = Math.max(0.54, 1 - lift / 520);
            return `translateX(-50%) scale(${scaleX}, ${scaleY})`;
          }),
          opacity: y.to((yVal) => {
            const lift = Math.max(0, -yVal);
            return Math.max(0.14, 0.34 - lift / 700);
          }),
          filter: y.to((yVal) => {
            const lift = Math.max(0, -yVal);
            const blur = 2 + lift / 18;
            return `blur(${blur}px)`;
          }),
        }}
      />
      <div className="w-full h-full preserve-3d" style={idleSpinStyle}>
        <animated.div
          className="w-full h-full relative preserve-3d"
          style={{ 
            transformStyle: "preserve-3d",
            transform: y.to(yVal => `translateY(${yVal}px)`)
              .to(t => `${t} scale(${scale.get()}) rotateX(${rotateX.get()}deg)`),
          }}
        >
          {renderEdgeLayers()}
          <div
            className="absolute inset-0 preserve-3d"
            style={{
              transform: `translateZ(${faceOffset}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            {renderFace(true)}
          </div>
          <div
            className="absolute inset-0 preserve-3d"
            style={{
              transform: `translateZ(-${faceOffset}px) rotateY(180deg)`,
              backfaceVisibility: "hidden",
            }}
          >
            {renderFace(false)}
          </div>
        </animated.div>
      </div>
    </div>
  );
}
