const SPARKS = [
  { left: "46%", top: "18%", delay: "0s", duration: "4.1s" },
  { left: "58%", top: "30%", delay: "1.4s", duration: "3.3s" },
  { left: "38%", top: "43%", delay: "2.6s", duration: "4.6s" },
  { left: "52%", top: "56%", delay: "0.8s", duration: "3.7s" },
  { left: "61%", top: "68%", delay: "3.2s", duration: "4.2s" },
  { left: "43%", top: "79%", delay: "1.9s", duration: "3.5s" },
];

function ColumnSvg() {
  return (
    <svg viewBox="0 0 100 640" preserveAspectRatio="none">
      <path d="M20 4 H80" className="pc-line-gold" vectorEffect="non-scaling-stroke" />
      <rect x="16" y="8" width="68" height="7" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M36 15 C16 15 6 24 6 36 C6 48 14 55 24 54 C32 53 36 46 32 40 C29 35 22 35 20 40 C19 44 22 47 25 46" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M64 15 C84 15 94 24 94 36 C94 48 86 55 76 54 C68 53 64 46 68 40 C71 35 78 35 80 40 C81 44 78 47 75 46" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M14 36 C14 44 19 49 25 48" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M86 36 C86 44 81 49 75 48" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <circle cx="24.5" cy="42.5" r="1.4" className="pc-eye" />
      <circle cx="75.5" cy="42.5" r="1.4" className="pc-eye" />
      <path d="M38 21 q3.5 7 7 0 M46.5 21 q3.5 7 7 0 M55 21 q3.5 7 7 0" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M33 57 H67" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M33 62 L29 562" className="pc-line-bold" vectorEffect="non-scaling-stroke" />
      <path d="M67 62 L71 562" className="pc-line-bold" vectorEffect="non-scaling-stroke" />
      <path d="M39.8 62 L37.4 562" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M46.6 62 L45.8 562" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M53.4 62 L54.2 562" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M60.2 62 L62.6 562" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M29 562 C29 574 25 580 19 582" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M71 562 C71 574 75 580 81 582" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M16 582 H84" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M16 582 C12 584 12 592 16 594" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M84 582 C88 584 88 592 84 594" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M16 594 H84" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M20 600 H80" className="pc-line pc-line-faint" vectorEffect="non-scaling-stroke" />
      <path d="M12 606 H88" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M12 606 C8 608 8 616 12 618" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M88 606 C92 608 92 616 88 618" className="pc-line" vectorEffect="non-scaling-stroke" />
      <path d="M12 618 H88" className="pc-line" vectorEffect="non-scaling-stroke" />
      <ellipse cx="50" cy="626" rx="52" ry="4.5" className="pc-ground-shadow" />
      <ellipse cx="50" cy="627" rx="64" ry="5.5" className="pc-ground-shadow pc-ground-shadow-wide" />
      <path d="M-8 621 H108" className="pc-line-bold" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Group({ side }) {
  return (
    <div className={`parthenon-grp parthenon-grp-${side}`} aria-hidden="true">
      <div className="pc-column pc-near">
        <ColumnSvg />
        {SPARKS.map((s) => (
          <i
            key={`${s.left}-${s.top}`}
            className="pc-spark"
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="pc-column pc-far">
        <ColumnSvg />
      </div>
    </div>
  );
}

export default function Parthenon() {
  return (
    <>
      <Group side="left" />
      <Group side="right" />
    </>
  );
}
