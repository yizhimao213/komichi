import { useEffect } from "react";

export default function CardSpotlight() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let rafId = 0;
    let lastEvent = null;

    const apply = () => {
      rafId = 0;
      const event = lastEvent;
      if (!event) return;
      const card = event.target instanceof Element ? event.target.closest(".card-spotlight") : null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    };

    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      lastEvent = event;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}

export function Spot() {
  return <span className="card-spot" aria-hidden="true" />;
}
