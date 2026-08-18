import { useEffect, useRef, useState } from "react";

type Lens = "all" | "verified" | "pending";

interface EvidenceLensProps {
  articleSelector?: string;
}

const storagePrefix = "embodied-frontier:evidence-lens:";
const options: Array<{ value: Lens; label: string }> = [
  { value: "all", label: "全部证据" },
  { value: "verified", label: "突出已核验" },
  { value: "pending", label: "突出待核" },
];

function isLens(value: string | null): value is Lens {
  return value === "all" || value === "verified" || value === "pending";
}

export default function EvidenceLens({ articleSelector = "article" }: EvidenceLensProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<Lens>("all");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const article = root.closest("article") ?? document.querySelector<HTMLElement>(articleSelector);
    const key = `${storagePrefix}${window.location.pathname}`;
    let initial: Lens = "all";
    try {
      const stored = window.localStorage.getItem(key);
      if (isLens(stored)) initial = stored;
    } catch {
      // Private browsing and disabled storage should not disable the reader.
    }
    setLens(initial);
    article?.setAttribute("data-evidence-lens", initial);
  }, [articleSelector]);

  function choose(next: Lens) {
    setLens(next);
    const root = rootRef.current;
    const article = root?.closest("article") ?? document.querySelector<HTMLElement>(articleSelector);
    article?.setAttribute("data-evidence-lens", next);
    try {
      window.localStorage.setItem(`${storagePrefix}${window.location.pathname}`, next);
    } catch {
      // Lens state is a convenience; never make reading depend on storage.
    }
  }

  return (
    <div ref={rootRef} className="evidence-lens" data-evidence-lens-control="true" aria-label="证据透镜">
      <span className="evidence-lens__label">证据透镜</span>
      <div className="evidence-lens__actions" role="group" aria-label="证据透镜模式">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="evidence-lens__button"
            data-lens={option.value}
            aria-pressed={lens === option.value}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
