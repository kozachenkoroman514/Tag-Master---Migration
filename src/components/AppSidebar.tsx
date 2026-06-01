import { Link, useLocation } from "react-router-dom";
import {
  IMDIcon,
  BugIcon,
  SettingsIcon,
} from "./NexusMenuIcons";

const TagMasterIcon = ({ className }: { className?: string }) => {
  const gold = "hsl(43 90% 50%)";
  const white = "hsl(0 0% 100%)";
  const SW = 2.2;
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Larger 4x6 label (back) */}
      <rect x={20} y={10} width={36} height={28} rx={2} fill={white} stroke={gold} strokeWidth={SW} />
      <line x1={26} y1={18} x2={50} y2={18} stroke={gold} strokeWidth={SW} />
      <line x1={26} y1={24} x2={44} y2={24} stroke={gold} strokeWidth={SW} />
      <line x1={26} y1={30} x2={40} y2={30} stroke={gold} strokeWidth={SW} />
      {/* Smaller 2x4 label (front, overlapping) */}
      <rect x={8} y={28} width={28} height={26} rx={2} fill={white} stroke={gold} strokeWidth={SW} />
      <line x1={13} y1={36} x2={31} y2={36} stroke={gold} strokeWidth={SW} />
      <line x1={13} y1={42} x2={27} y2={42} stroke={gold} strokeWidth={SW} />
      <line x1={13} y1={48} x2={24} y2={48} stroke={gold} strokeWidth={SW} />
      {/* Punch holes */}
      <circle cx={26} cy={14} r={1.4} fill={gold} />
      <circle cx={13} cy={32} r={1.2} fill={gold} />
    </svg>
  );
};
import ThemeToggle from "./ThemeToggle";

const SIDEBAR_W = "w-[100px]";

interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
}

const AppSidebar = () => {
  const location = useLocation();

  const topItems: NavItem[] = [
    { to: "/", label: "Labels", icon: (a) => <IMDIcon className="w-11 h-11" active={a} /> },
  ];
  const bottomItems: NavItem[] = [
    { to: "/settings", label: "Settings", icon: (a) => <SettingsIcon className="w-11 h-11" active={a} /> },
  ];

  const renderLink = (item: NavItem) => {
    const active =
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        title={item.label}
        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center transition-all border-2 ${
          active
            ? "border-ring text-accent-foreground"
            : "border-transparent text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground"
        }`}
      >
        {item.icon(active)}
        {item.label}
      </Link>
    );
  };

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${SIDEBAR_W} bg-accent text-accent-foreground flex flex-col items-center z-40 border-r border-border/30`}>
      <div className="flex flex-col items-center gap-1 pt-4 pb-2 px-2 w-full">
        <TagMasterIcon className="w-20 h-20" />
        <span className="font-bold text-[11px] tracking-[0.2em] text-ring text-center leading-tight mt-1 uppercase">
          Tag Master
        </span>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-ring/40 to-transparent mt-1" />
      </div>

      <nav className="flex flex-col gap-2 w-full px-2 mt-1 flex-1 min-h-0 overflow-y-auto">
        {topItems.map(renderLink)}

        {(() => {
          const active = location.pathname.startsWith("/bug-report");
          return (
            <Link
              to="/bug-report"
              title="Bug Report"
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center transition-all border-2 ${
                active
                  ? "border-ring text-accent-foreground"
                  : "border-transparent text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground"
              }`}
            >
              <BugIcon className="w-11 h-11" active={active} />
              Bug Report
            </Link>
          );
        })()}

        {bottomItems.map(renderLink)}
      </nav>

      <div className="pb-4 pt-2 flex flex-col items-center w-full px-2">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-ring/40 to-transparent mb-3" />
        <ThemeToggle />
      </div>
    </aside>
  );
};

export default AppSidebar;
