import { useEffect, useMemo, useState } from "react";

export default function TypewriterQuote({ quotes, holdMs = 5000 }) {
  const list = useMemo(() => (quotes || []).map((q) => String(q).trim()).filter(Boolean), [quotes]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [phase, setPhase] = useState("type");

  useEffect(() => {
    if (!list.length) return;
    const full = list[index % list.length];

    if (phase === "hold") {
      const t = setTimeout(() => setPhase("erase"), holdMs);
      return () => clearTimeout(t);
    }

    if (phase === "type") {
      if (shown.length >= full.length) {
        setPhase("hold");
        return;
      }
      const t = setTimeout(() => setShown(full.slice(0, shown.length + 1)), 48);
      return () => clearTimeout(t);
    }

    if (shown.length === 0) {
      setIndex((i) => (i + 1) % list.length);
      setPhase("type");
      return;
    }
    const t = setTimeout(() => setShown(shown.slice(0, -1)), 22);
    return () => clearTimeout(t);
  }, [list, index, shown, phase, holdMs]);

  if (!list.length) return null;

  return (
    <p className="quote quote-type">
      「{shown}」
      <span className="caret" aria-hidden="true" />
    </p>
  );
}
