/**
 * Menu icons — glassmorphic overlap style.
 * Translucent white / light gray filled shapes, no heavy strokes.
 * Selection state is handled by the parent (outlined rounded-square), NOT by recoloring.
 */

const W = "hsl(0 0% 100%)";
const G = "hsl(0 0% 90%)";
const G2 = "hsl(0 0% 80%)";

interface Props {
  className?: string;
  active?: boolean;
}

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
    {/* truck body */}
    <rect x="6" y="18" width="34" height="26" rx="5" fill={W} fillOpacity={0.9} />
    {/* cab */}
    <path d="M34 24 H48 L58 34 V44 H34 Z" fill={G} fillOpacity={0.75} />
    {/* cargo window */}
    <rect x="38" y="28" width="9" height="6" rx="2" fill={W} fillOpacity={0.5} />
    {/* wheels */}
    <circle cx="18" cy="48" r="6" fill={W} fillOpacity={0.95} />
    <circle cx="48" cy="48" r="6" fill={W} fillOpacity={0.95} />
    {/* small detail line */}
    <rect x="10" y="24" width="22" height="3" rx="1.5" fill={W} fillOpacity={0.35} />
  </Svg>
);

/* ============ IMD — shelving / inventory ============ */
export const IMDIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* back upright */}
    <rect x="12" y="8" width="40" height="48" rx="4" fill={G} fillOpacity={0.6} />
    {/* shelves */}
    <rect x="8" y="14" width="48" height="8" rx="3" fill={W} fillOpacity={0.85} />
    <rect x="8" y="30" width="48" height="8" rx="3" fill={W} fillOpacity={0.85} />
    <rect x="8" y="46" width="48" height="8" rx="3" fill={W} fillOpacity={0.85} />
    {/* boxes */}
    <rect x="14" y="20" width="14" height="10" rx="2" fill={G2} fillOpacity={0.7} />
    <rect x="34" y="36" width="14" height="10" rx="2" fill={G2} fillOpacity={0.7} />
  </Svg>
);

/* ============ Kiosk — monitor on stand ============ */
export const KioskIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* stand base */}
    <rect x="18" y="52" width="28" height="6" rx="3" fill={W} fillOpacity={0.85} />
    {/* stand pole */}
    <rect x="28" y="42" width="8" height="12" rx="2" fill={G} fillOpacity={0.7} />
    {/* monitor frame */}
    <rect x="6" y="8" width="52" height="36" rx="6" fill={W} fillOpacity={0.9} />
    {/* screen */}
    <rect x="11" y="13" width="42" height="26" rx="4" fill={G} fillOpacity={0.5} />
    {/* screen content lines */}
    <rect x="16" y="19" width="28" height="3" rx="1.5" fill={W} fillOpacity={0.6} />
    <rect x="16" y="26" width="20" height="3" rx="1.5" fill={W} fillOpacity={0.4} />
  </Svg>
);

/* ============ Reports — bars + trend ============ */
export const ReportsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* back card */}
    <rect x="8" y="8" width="48" height="48" rx="6" fill={G} fillOpacity={0.5} />
    {/* bars */}
    <rect x="14" y="34" width="10" height="16" rx="3" fill={W} fillOpacity={0.9} />
    <rect x="27" y="24" width="10" height="26" rx="3" fill={W} fillOpacity={0.8} />
    <rect x="40" y="14" width="10" height="36" rx="3" fill={W} fillOpacity={0.65} />
    {/* trend line overlay */}
    <path d="M14 30 L27 22 L40 14 L52 8" stroke={W} strokeWidth={3} strokeOpacity={0.95} strokeLinecap="round" />
    <circle cx="14" cy="30" r="3" fill={W} fillOpacity={0.95} />
    <circle cx="27" cy="22" r="3" fill={W} fillOpacity={0.95} />
    <circle cx="40" cy="14" r="3" fill={W} fillOpacity={0.95} />
  </Svg>
);

/* ============ Notifications — bell with waves ============ */
export const NotificationsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* side waves */}
    <path d="M10 28 Q4 36 10 46" stroke={G} strokeWidth={4} strokeOpacity={0.7} strokeLinecap="round" fill="none" />
    <path d="M54 28 Q60 36 54 46" stroke={G} strokeWidth={4} strokeOpacity={0.7} strokeLinecap="round" fill="none" />
    {/* bell body */}
    <path d="M16 44 C16 28 24 18 32 18 C40 18 48 28 48 44 Z" fill={W} fillOpacity={0.9} />
    {/* gong */}
    <path d="M28 48 Q32 54 36 48" fill={G} fillOpacity={0.7} />
    {/* handle */}
    <rect x="28" y="10" width="8" height="10" rx="4" fill={G} fillOpacity={0.8} />
    {/* clapper */}
    <circle cx="32" cy="38" r="4" fill={G2} fillOpacity={0.85} />
  </Svg>
);

/* ============ Bug Report — bug ============ */
export const BugIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* left legs */}
    <path d="M20 30 L8 24" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    <path d="M20 38 L6 38" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    <path d="M20 46 L8 52" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    {/* right legs */}
    <path d="M44 30 L56 24" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    <path d="M44 38 L58 38" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    <path d="M44 46 L56 52" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    {/* antennae */}
    <path d="M26 18 L22 10" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    <path d="M38 18 L42 10" stroke={G} strokeWidth={3.5} strokeLinecap="round" />
    {/* body */}
    <ellipse cx="32" cy="38" rx="14" ry="16" fill={W} fillOpacity={0.9} />
    {/* center stripe */}
    <rect x="30" y="24" width="4" height="28" rx="2" fill={G} fillOpacity={0.6} />
    {/* head */}
    <circle cx="32" cy="18" r="5" fill={G2} fillOpacity={0.8} />
  </Svg>
);

/* ============ Settings — gear ============ */
export const SettingsIcon = ({ className }: Props) => {
  const cx = 32;
  const cy = 32;
  const teeth = 8;
  const inner = 14;
  const outer = 26;
  const tickW = 7;
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
      {/* gear teeth */}
      <path d={tickPaths} fill={W} fillOpacity={0.85} />
      {/* inner ring */}
      <circle cx={cx} cy={cy} r={inner} fill={G} fillOpacity={0.7} />
      {/* center hole */}
      <circle cx={cx} cy={cy} r={6} fill={G2} fillOpacity={0.9} />
    </Svg>
  );
};