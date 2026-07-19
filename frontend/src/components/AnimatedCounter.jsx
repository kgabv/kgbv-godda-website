import React, { useEffect, useRef, useState } from "react";

export default function AnimatedCounter({ end, label, suffix = "+", testId }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const dur = 1500;
          const start = performance.now();
          const step = (t) => {
            const p = Math.min(1, (t - start) / dur);
            setVal(Math.floor(end * (0.2 + 0.8 * p)));
            if (p < 1) requestAnimationFrame(step);
            else setVal(end);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [end]);
  return (
    <div ref={ref} className="text-center" data-testid={testId}>
      <div className="text-4xl md:text-5xl font-extrabold text-primary">{val.toLocaleString("hi-IN")}{suffix}</div>
      <div className="mt-2 text-sm md:text-base text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
