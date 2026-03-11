import { useState, useEffect } from "react";

const cards = [
  {
    label: "Legal",
    letter: "L",
    barPercent: 78,
    barColor: "bg-violet-500",
    iconBg: "bg-violet-600",
    opacity: 0.09,
    dimensions: [
      { name: "Regulatory Exposure", pct: "30%" },
      { name: "Contract Lock-In", pct: "25%" },
      { name: "Litigation Likelihood", pct: "20%" },
    ],
  },
  {
    label: "Financial",
    letter: "F",
    barPercent: 82,
    barColor: "bg-emerald-500",
    iconBg: "bg-emerald-600",
    opacity: 0.18,
    dimensions: [
      { name: "Upside / Expected Value", pct: "25%" },
      { name: "Capital Intensity", pct: "20%" },
      { name: "Downside Severity", pct: "25%" },
    ],
  },
  {
    label: "Technical",
    letter: "T",
    barPercent: 90,
    barColor: "bg-cyan-500",
    iconBg: "bg-cyan-600",
    opacity: 0.12,
    dimensions: [
      { name: "Scalability", pct: "20%" },
      { name: "Execution Complexity", pct: "20%" },
      { name: "Technical Debt", pct: "20%" },
    ],
  },
  {
    label: "Business Dev",
    letter: "BD",
    barPercent: 65,
    barColor: "bg-amber-500",
    iconBg: "bg-amber-600",
    active: true,
    opacity: 0.14,
    dimensions: [
      { name: "Market Opportunity", pct: "25%" },
      { name: "Competitive Position", pct: "20%" },
      { name: "Strategic Alignment", pct: "15%" },
    ],
  },
  {
    label: "Tax",
    letter: "T",
    barPercent: 80,
    barColor: "bg-violet-500",
    iconBg: "bg-violet-600",
    opacity: 0.2,
    dimensions: [
      { name: "Tax Efficiency", pct: "25%" },
      { name: "Structural Optimization", pct: "25%" },
      { name: "Jurisdictional Risk", pct: "25%" },
    ],
  },
];

const CENTER_X = 50;
const CENTER_Y = 50;
const RADIUS = 28;
const ANGLES = [0, 72, 144, 216, 288];

const SLOT_STYLES: React.CSSProperties[] = ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  const left = CENTER_X + RADIUS * Math.cos(rad);
  const top = CENTER_Y + RADIUS * Math.sin(rad);
  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: "translate(-50%, -50%)",
  };
});

function shuffleSlots(): number[] {
  const a = [0, 1, 2, 3, 4];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BackgroundCards = () => {
  const [cardToSlot, setCardToSlot] = useState(() => [0, 1, 2, 3, 4]);

  useEffect(() => {
    const id = setInterval(() => {
      setCardToSlot(shuffleSlots());
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden
    >
      <div className="absolute inset-0 bg-background/30" />
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="absolute w-[120px] sm:w-[180px] md:w-[260px] max-w-[calc(100vw-2rem)] will-change-[left,top]"
          style={{
            ...SLOT_STYLES[cardToSlot[i]],
            transition: "left 1.6s cubic-bezier(0.4, 0, 0.2, 1), top 1.6s cubic-bezier(0.4, 0, 0.2, 1), transform 1.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <BackgroundCard card={card} />
        </div>
      ))}
    </div>
  );
};

const BackgroundCard = ({
  card,
}: {
  card: (typeof cards)[0];
}) => {
  return (
    <div
      className={`rounded-lg md:rounded-xl border border-border bg-card p-2 sm:p-3 md:p-4 transition-opacity duration-1000 ${
        card.active ? "ring-1 ring-primary/30" : ""
      }`}
      style={{ opacity: card.opacity }}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
        <div
          className={`h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 rounded-full ${card.iconBg} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-white text-[8px] sm:text-[10px] md:text-xs font-semibold">{card.letter}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-foreground truncate">{card.label}</span>
            {card.active && (
              <span className="rounded bg-cyan-500/80 px-1 py-0.5 text-[8px] sm:text-[10px] font-medium text-white">
                Active
              </span>
            )}
          </div>
          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground hidden sm:block">
            5 dimensions - weighted scoring
          </p>
        </div>
      </div>
      <div className="h-1 sm:h-1.5 rounded-full bg-muted overflow-hidden mb-1.5 sm:mb-3">
        <div
          className={`h-full rounded-full ${card.barColor}`}
          style={{ width: `${card.barPercent}%` }}
        />
      </div>
      <ul className="space-y-0.5 sm:space-y-1">
        {card.dimensions.map((d) => (
          <li
            key={d.name}
            className="flex justify-between text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground"
          >
            <span className="truncate mr-1">{d.name}</span>
            <span>{d.pct}</span>
          </li>
        ))}
        <li className="text-[8px] sm:text-[10px] text-muted-foreground/80 pt-0.5 hidden sm:block">
          +2 more dimensions
        </li>
      </ul>
    </div>
  );
};

export default BackgroundCards;
