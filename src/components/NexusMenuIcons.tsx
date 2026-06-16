/**
 * Menu icons — full white, outline-only style.
 * Selection state is handled by the parent (outlined rounded-square), NOT by recoloring.
 */

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
    {/* truck body outline */}
    <path d="M6 18 H34 V44 H6 Z" stroke={WHITE} strokeWidth={SW} />
    <path d="M34 26 H48 L58 36 V44 H34 Z" stroke={WHITE} strokeWidth={SW} />
    {/* wheels */}
    <circle cx={18} cy={48} r={5} stroke={WHITE} strokeWidth={SW} />
    <circle cx={48} cy={48} r={5} stroke={WHITE} strokeWidth={SW} />
    {/* window */}
    <rect x={38} y={29} width={8} height={6} stroke={WHITE} strokeWidth={SW} />
    {/* cargo line */}
    <line x1={10} y1={26} x2={30} y2={26} stroke={WHITE} strokeWidth={2} />
  </Svg>
);

/* ============ IMD — shelving with boxes ============ */
export const IMDIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* uprights */}
    <line x1={8} y1={10} x2={8} y2={56} stroke={WHITE} strokeWidth={SW} />
    <line x1={56} y1={10} x2={56} y2={56} stroke={WHITE} strokeWidth={SW} />
    {/* shelves */}
    <line x1={8} y1={32} x2={56} y2={32} stroke={WHITE} strokeWidth={SW} />
    <line x1={8} y1={54} x2={56} y2={54} stroke={WHITE} strokeWidth={SW} />
    {/* feet */}
    <line x1={8} y1={54} x2={4} y2={58} stroke={WHITE} strokeWidth={SW} />
    <line x1={56} y1={54} x2={60} y2={58} stroke={WHITE} strokeWidth={SW} />
    {/* top shelf */}
    <line x1={8} y1={10} x2={56} y2={10} stroke={WHITE} strokeWidth={SW} />
    {/* boxes on shelves */}
    <rect x={26} y={14} width={14} height={14} stroke={WHITE} strokeWidth={SW} />
    <rect x={14} y={36} width={14} height={14} stroke={WHITE} strokeWidth={SW} />
    <rect x={32} y={36} width={14} height={14} stroke={WHITE} strokeWidth={SW} />
  </Svg>
);

/* ============ Kiosk — monitor on stand ============ */
export const KioskIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* monitor frame */}
    <rect x={6} y={10} width={52} height={34} rx={3} stroke={WHITE} strokeWidth={SW} />
    {/* screen inner line */}
    <rect x={10} y={14} width={44} height={26} rx={2} stroke={WHITE} strokeWidth={2} />
    {/* line inside screen */}
    <line x1={14} y1={22} x2={50} y2={22} stroke={WHITE} strokeWidth={2} />
    <line x1={14} y1={28} x2={40} y2={28} stroke={WHITE} strokeWidth={2} />
    {/* stand pole */}
    <line x1={32} y1={44} x2={32} y2={52} stroke={WHITE} strokeWidth={SW} />
    {/* base */}
    <line x1={18} y1={54} x2={46} y2={54} stroke={WHITE} strokeWidth={SW} />
    {/* base dot */}
    <circle cx={46} cy={54} r={2.5} stroke={WHITE} strokeWidth={2} />
  </Svg>
);

/* ============ Reports — bars + trend line ============ */
export const ReportsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* bars */}
    <rect x={10} y={38} width={10} height={18} stroke={WHITE} strokeWidth={SW} />
    <rect x={26} y={28} width={10} height={28} stroke={WHITE} strokeWidth={SW} />
    <rect x={42} y={18} width={10} height={38} stroke={WHITE} strokeWidth={SW} />
    {/* trend line */}
    <polyline points="14,30 30,20 46,10" stroke={WHITE} strokeWidth={SW} fill="none" />
    <circle cx={14} cy={30} r={3.6} stroke={WHITE} strokeWidth={2} />
    <circle cx={30} cy={20} r={3.6} stroke={WHITE} strokeWidth={2} />
    <circle cx={46} cy={10} r={3.6} stroke={WHITE} strokeWidth={2} fill="none" />
  </Svg>
);

/* ============ Notifications — bell with side arcs ============ */
export const NotificationsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* side arcs */}
    <path d="M10 28 Q6 36 10 46" stroke={WHITE} strokeWidth={SW} fill="none" />
    <path d="M54 28 Q58 36 54 46" stroke={WHITE} strokeWidth={SW} fill="none" />
    {/* bell body */}
    <path d="M16 44 C16 30 22 20 32 20 C42 20 48 30 48 44 Z" stroke={WHITE} strokeWidth={SW} fill="none" />
    {/* gong */}
    <path d="M28 48 Q32 54 36 48" stroke={WHITE} strokeWidth={SW} fill="none" />
    {/* handle */}
    <line x1={32} y1={20} x2={32} y2={14} stroke={WHITE} strokeWidth={SW} />
    {/* clapper */}
    <circle cx={32} cy={38} r={3.5} stroke={WHITE} strokeWidth={2} />
  </Svg>
);

/* ============ Bug Report — bug body + legs ============ */
export const BugIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* legs left */}
    <line x1={18} y1={28} x2={8} y2={24} stroke={WHITE} strokeWidth={SW} />
    <line x1={16} y1={36} x2={6} y2={36} stroke={WHITE} strokeWidth={SW} />
    <line x1={18} y1={44} x2={8} y2={48} stroke={WHITE} strokeWidth={SW} />
    {/* legs right */}
    <line x1={46} y1={28} x2={56} y2={24} stroke={WHITE} strokeWidth={SW} />
    <line x1={48} y1={36} x2={58} y2={36} stroke={WHITE} strokeWidth={SW} />
    <line x1={46} y1={44} x2={56} y2={48} stroke={WHITE} strokeWidth={SW} />
    {/* antennae */}
    <line x1={26} y1={18} x2={22} y2={10} stroke={WHITE} strokeWidth={SW} />
    <line x1={38} y1={18} x2={42} y2={10} stroke={WHITE} strokeWidth={SW} />
    {/* body */}
    <ellipse cx={32} cy={36} rx={14} ry={16} stroke={WHITE} strokeWidth={SW} fill="none" />
    {/* center stripe */}
    <line x1={32} y1={22} x2={32} y2={50} stroke={WHITE} strokeWidth={SW} />
    {/* head dot */}
    <circle cx={32} cy={18} r={3} stroke={WHITE} strokeWidth={2} fill="none" />
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
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={outer} stroke={WHITE} strokeWidth={SW} fill="none" />
      {/* teeth */}
      <path d={tickPaths} stroke={WHITE} strokeWidth={SW} fill="none" />
      {/* inner circle */}
      <circle cx={cx} cy={cy} r={inner} stroke={WHITE} strokeWidth={SW} fill="none" />
      {/* center hole */}
      <circle cx={cx} cy={cy} r={5} stroke={WHITE} strokeWidth={SW} fill="none" />
    </Svg>
  );
};
