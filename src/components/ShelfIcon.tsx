interface Props {
  className?: string;
  strokeWidth?: number;
}

/**
 * Minimalistic shelving unit with boxes for IMD.
 * Lucide-style: currentColor stroke, no fill, rounded joins.
 */
const ShelfIcon = ({ className, strokeWidth = 2 }: Props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Uprights */}
    <line x1="3" y1="4" x2="3" y2="21" />
    <line x1="21" y1="4" x2="21" y2="21" />
    {/* Shelves */}
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="16" x2="21" y2="16" />
    {/* Feet */}
    <line x1="2" y1="21" x2="6" y2="21" />
    <line x1="18" y1="21" x2="22" y2="21" />
    {/* Top shelf boxes */}
    <rect x="5" y="5.5" width="4" height="4.5" />
    <rect x="10" y="5.5" width="6" height="4.5" />
    {/* Bottom shelf boxes */}
    <rect x="5" y="11.5" width="5" height="4.5" />
    <rect x="11" y="11.5" width="3.5" height="4.5" />
    <rect x="15.5" y="11.5" width="3.5" height="4.5" />
  </svg>
);

export default ShelfIcon;
