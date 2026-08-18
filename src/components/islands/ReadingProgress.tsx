import { useEffect, useRef, useState } from "react";

interface ReadingProgressProps {
  articleSelector?: string;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export default function ReadingProgress({ articleSelector = "article" }: ReadingProgressProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const article = host.closest("article") ?? document.querySelector<HTMLElement>(articleSelector);
    if (!article) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const range = Math.max(1, article.scrollHeight - window.innerHeight);
      const next = clamp((window.scrollY - start) / range);
      setProgress(next);
      barRef.current?.style.setProperty("transform", `scaleX(${next})`);
      host.setAttribute("aria-valuenow", String(Math.round(next * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [articleSelector]);

  return (
    <div
      ref={hostRef}
      className="reading-progress"
      data-reading-progress="true"
      role="progressbar"
      aria-label="阅读进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span className="reading-progress__label">阅读进度</span>
      <span className="reading-progress__track" aria-hidden="true">
        <span ref={barRef} className="reading-progress__bar" />
      </span>
      <span className="reading-progress__value">{Math.round(progress * 100)}%</span>
    </div>
  );
}
