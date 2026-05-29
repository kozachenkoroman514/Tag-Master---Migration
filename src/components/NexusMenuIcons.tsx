/**
 * Menu icons — primarily gold with small white accents (matching the Nexus hub icon).
 * Selection state is handled by the parent (outlined rounded-square), NOT by recoloring.
 */

const GOLD = "hsl(43 90% 50%)";
const WHITE = "hsl(0 0% 100%)";

interface Props {
  className?: string;
  active?: boolean;
}

const SW = 3;

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/* ============ ILD — delivery truck ============ */
export const ILDIcon = ({ className }: Props) => (
  <Svg className={className}>
    <path d="M6 18 H34 V44 H6 Z" fill={GOLD} />
    <path d="M34 26 H48 L58 36 V44 H34 Z" fill={GOLD} />
    {/* hollow white wheels */}
    <circle cx={18} cy={48} r={5} fill="none" stroke={WHITE} strokeWidth={SW} />
    <circle cx={48} cy={48} r={5} fill="none" stroke={WHITE} strokeWidth={SW} />
    {/* white window accent */}
    <rect x={38} y={29} width={8} height={6} fill={WHITE} />
  </Svg>
);

/* ============ IMD — shelving with boxes ============ */
export const IMDIcon = ({ className }: Props) => (
  <Svg className={className}>
    <line x1={8} y1={10} x2={8} y2={56} stroke={GOLD} strokeWidth={SW} />
    <line x1={56} y1={10} x2={56} y2={56} stroke={GOLD} strokeWidth={SW} />
    <line x1={8} y1={32} x2={56} y2={32} stroke={GOLD} strokeWidth={SW} />
    <line x1={8} y1={54} x2={56} y2={54} stroke={GOLD} strokeWidth={SW} />
    <line x1={8} y1={54} x2={4} y2={58} stroke={GOLD} strokeWidth={SW} />
    <line x1={56} y1={54} x2={60} y2={58} stroke={GOLD} strokeWidth={SW} />
    <rect x={26} y={14} width={14} height={14} fill="none" stroke={WHITE} strokeWidth={SW} />
    <rect x={14} y={36} width={14} height={14} fill={WHITE} />
    <rect x={32} y={36} width={14} height={14} fill={GOLD} />
  </Svg>
);

/* ============ Kiosk — monitor on stand ============ */
export const KioskIcon = ({ className }: Props) => (
  <Svg className={className}>
    <defs>
      <mask id="kioskScreenMask">
        <rect x={0} y={0} width={64} height={64} fill="white" />
        <rect x={10} y={32} width={44} height={10} fill="black" />
      </mask>
    </defs>
    {/* gold monitor with bottom strip cut out */}
    <rect x={6} y={10} width={52} height={34} rx={3} fill={GOLD} mask="url(#kioskScreenMask)" />
    {/* white outline rectangle spanning the bottom of the screen */}
    <rect x={10} y={32} width={44} height={10} fill="none" stroke={WHITE} strokeWidth={SW} />
    {/* top white line inside screen */}
    <line x1={14} y1={20} x2={50} y2={20} stroke={WHITE} strokeWidth={SW} />
    <line x1={32} y1={44} x2={32} y2={52} stroke={GOLD} strokeWidth={SW} />
    <line x1={18} y1={54} x2={46} y2={54} stroke={GOLD} strokeWidth={SW} />
    <circle cx={46} cy={54} r={2.5} fill={GOLD} />
  </Svg>
);

/* ============ Reports — bars + trend line ============ */
export const ReportsIcon = ({ className }: Props) => (
  <Svg className={className}>
    <rect x={10} y={38} width={10} height={18} fill={GOLD} />
    <rect x={26} y={28} width={10} height={28} fill={GOLD} />
    <rect x={42} y={18} width={10} height={38} fill={GOLD} />
    {/* white trend line accent */}
    <polyline points="14,30 30,20 46,10" stroke={WHITE} strokeWidth={SW} fill="none" />
    <circle cx={14} cy={30} r={3.6} fill={WHITE} />
    <circle cx={30} cy={20} r={3.6} fill={WHITE} />
    <circle cx={46} cy={10} r={3.6} fill="none" stroke={WHITE} strokeWidth={SW} />
  </Svg>
);

/* ============ Notifications — bell with side arcs ============ */
export const NotificationsIcon = ({ className }: Props) => (
  <Svg className={className}>
    <path d="M10 28 Q6 36 10 46" stroke={GOLD} strokeWidth={SW} fill="none" />
    <path d="M54 28 Q58 36 54 46" stroke={GOLD} strokeWidth={SW} fill="none" />
    <path d="M16 44 C16 30 22 20 32 20 C42 20 48 30 48 44 Z" fill={GOLD} />
    {/* white gong under bell */}
    <path d="M28 48 Q32 54 36 48" fill={WHITE} stroke={WHITE} strokeWidth={SW} />
    {/* white handle on top */}
    <line x1={32} y1={20} x2={32} y2={14} stroke={WHITE} strokeWidth={SW} />
    {/* white clapper accent */}
    <circle cx={32} cy={38} r={3.5} fill={WHITE} />
  </Svg>
);

/* ============ Bug Report — bug body + legs ============ */
export const BugIcon = ({ className }: Props) => (
  <Svg className={className}>
    <line x1={18} y1={28} x2={8} y2={24} stroke={GOLD} strokeWidth={SW} />
    <line x1={16} y1={36} x2={6} y2={36} stroke={GOLD} strokeWidth={SW} />
    <line x1={18} y1={44} x2={8} y2={48} stroke={GOLD} strokeWidth={SW} />
    <line x1={46} y1={28} x2={56} y2={24} stroke={GOLD} strokeWidth={SW} />
    <line x1={48} y1={36} x2={58} y2={36} stroke={GOLD} strokeWidth={SW} />
    <line x1={46} y1={44} x2={56} y2={48} stroke={GOLD} strokeWidth={SW} />
    {/* white antennae */}
    <line x1={26} y1={18} x2={22} y2={10} stroke={WHITE} strokeWidth={SW} />
    <line x1={38} y1={18} x2={42} y2={10} stroke={WHITE} strokeWidth={SW} />
    <ellipse cx={32} cy={36} rx={14} ry={16} fill={GOLD} />
    {/* white center-stripe accent */}
    <line x1={32} y1={22} x2={32} y2={50} stroke={WHITE} strokeWidth={SW} />
  </Svg>
);

/* ============ Settings — gear ============ */
export const SettingsIcon = ({ className }: Props) => {
  const cx = 32;
  const cy = 32;
  const teeth = 8;
  const inner = 14;
  const outer = 24;
  const tickW = 5;
  const tickPaths = Array.from({ length: teeth }, (_, i) => {
    const a = (i / teeth) * Math.PI * 2;
    const x1 = cx + inner * Math.cos(a);
    const y1 = cy + inner * Math.sin(a);
    const x2 = cx + outer * Math.cos(a);
    const y2 = cy + outer * Math.sin(a);
    const px = -Math.sin(a) * (tickW / 2);
    const py = Math.cos(a) * (tickW / 2);
    return `M${x1 + px},${y1 + py} L${x2 + px},${y2 + py} L${x2 - px},${y2 - py} L${x1 - px},${y1 - py} Z`;
  }).join(" ");

  return (
    <Svg className={className}>
      <defs>
        <mask id="gearCenterMask">
          <rect x={0} y={0} width={64} height={64} fill="white" />
          <circle cx={cx} cy={cy} r={5} fill="black" />
        </mask>
      </defs>
      <g mask="url(#gearCenterMask)">
        <circle cx={cx} cy={cy} r={inner} fill={GOLD} />
        <path d={tickPaths} fill={GOLD} />
      </g>
      {/* hollow white center — gold cut out underneath */}
      <circle cx={cx} cy={cy} r={5} fill="none" stroke={WHITE} strokeWidth={SW} />
    </Svg>
  );
};
