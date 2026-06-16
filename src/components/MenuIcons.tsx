import { Bug, Settings } from "lucide-react";

/**
 * Menu icons — bold solid filled "Streamline" style.
 * Single-color white silhouettes with thick chunky shapes.
 * Selection state is handled by the parent (outlined rounded-square), NOT by recoloring.
 */

const W = "hsl(0 0% 100%)";

interface Props {
  className?: string;
  active?: boolean;
}

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    fill={W}
    stroke={W}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/* Outline-only Svg (no fill) used by the refreshed Bug + Settings icons. */
const OutlineSvg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    fill="none"
    stroke={W}
    strokeWidth={3}
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
    {/* cargo box */}
    <path d="M4 18 h32 v22 h-32 z" />
    {/* cab */}
    <path d="M36 24 h12 l10 10 v6 h-22 z" />
    {/* axle bar */}
    <rect x="4" y="40" width="56" height="3" />
    {/* wheels (hollow via even-odd-ish: draw circle then hole) */}
    <path d="M18 54 a6 6 0 1 1 0.001 0 z M18 50 a2 2 0 1 0 0.001 0 z" fillRule="evenodd" />
    <path d="M48 54 a6 6 0 1 1 0.001 0 z M48 50 a2 2 0 1 0 0.001 0 z" fillRule="evenodd" />
  </Svg>
);

/* ============ IMD — shelving / inventory ============ */
export const IMDIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* uprights */}
    <rect x="6" y="8" width="4" height="48" />
    <rect x="54" y="8" width="4" height="48" />
    {/* shelves */}
    <rect x="6" y="14" width="52" height="5" />
    <rect x="6" y="32" width="52" height="5" />
    <rect x="6" y="50" width="52" height="5" />
    {/* boxes */}
    <rect x="14" y="22" width="12" height="9" />
    <rect x="32" y="40" width="14" height="9" />
  </Svg>
);

/* ============ Kiosk — monitor on stand ============ */
export const KioskIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* monitor — outer rect with screen cut-out (even-odd) */}
    <path
      d="M6 8 h52 v36 h-52 z M11 13 h42 v26 h-42 z"
      fillRule="evenodd"
    />
    {/* stand */}
    <rect x="28" y="44" width="8" height="10" />
    <rect x="18" y="54" width="28" height="5" rx="1" />
  </Svg>
);

/* ============ Reports — bars + trend ============ */
export const ReportsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* axis */}
    <rect x="6" y="52" width="52" height="4" />
    <rect x="6" y="10" width="4" height="46" />
    {/* bars */}
    <rect x="16" y="36" width="9" height="16" />
    <rect x="29" y="26" width="9" height="26" />
    <rect x="42" y="16" width="9" height="36" />
  </Svg>
);

/* ============ Notifications — bell with waves ============ */
export const NotificationsIcon = ({ className }: Props) => (
  <Svg className={className}>
    {/* bell body */}
    <path d="M14 44 C14 26 22 16 32 16 C42 16 50 26 50 44 Z" />
    {/* base bar */}
    <rect x="10" y="44" width="44" height="4" rx="1" />
    {/* clapper */}
    <circle cx="32" cy="54" r="4" />
    {/* top handle */}
    <rect x="28" y="10" width="8" height="6" rx="2" />
  </Svg>
);

/* ============ Bug Report — pulled from Woodshop Manager (lucide-react Bug) ============ */
export const BugIcon = ({ className }: Props) => (
  <Bug className={className} strokeWidth={2} />
);

/* ============ Settings — pulled from Woodshop Manager (lucide-react Settings) ============ */
export const SettingsIcon = ({ className }: Props) => (
  <Settings className={className} strokeWidth={2} />
);