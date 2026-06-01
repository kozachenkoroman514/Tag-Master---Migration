import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IMDIcon,
  BugIcon,
  SettingsIcon,
} from "./NexusMenuIcons";

const NexusHubIcon = ({ className }: { className?: string }) => {
  // Asymmetrical hub-and-spoke: varying angles, lengths, node sizes, and colors
  const cx = 32;
  const cy = 32;
  const innerR = 8;
  const gold = "hsl(43 90% 50%)";
  const white = "hsl(0 0% 100%)";

  const spokes: {
    deg: number;
    outerR: number;
    nodeR: number;
    width: number;
    fill: string | null;
    stroke: string;
  }[] = [
    { deg: 0, outerR: 28, nodeR: 4.2, width: 2.6, fill: white, stroke: white },
    { deg: 28, outerR: 22, nodeR: 3.0, width: 2.0, fill: null, stroke: white },
    { deg: 58, outerR: 26, nodeR: 3.6, width: 2.2, fill: null, stroke: gold },
    { deg: 95, outerR: 20, nodeR: 2.6, width: 1.8, fill: white, stroke: white },
    { deg: 138, outerR: 29, nodeR: 4.0, width: 2.4, fill: null, stroke: gold },
    { deg: 172, outerR: 18, nodeR: 2.4, width: 1.6, fill: white, stroke: white },
    { deg: 210, outerR: 24, nodeR: 3.2, width: 2.0, fill: null, stroke: white },
    { deg: 250, outerR: 21, nodeR: 2.8, width: 1.8, fill: null, stroke: gold },
    { deg: 290, outerR: 27, nodeR: 3.8, width: 2.2, fill: null, stroke: white },
    { deg: 332, outerR: 19, nodeR: 2.6, width: 1.8, fill: white, stroke: white },
  ];

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      stroke={gold}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      {spokes.map((s, i) => {
        const rad = (s.deg * Math.PI) / 180;
        const x1 = cx + innerR * Math.cos(rad);
        const y1 = cy + innerR * Math.sin(rad);
        const x2 = cx + s.outerR * Math.cos(rad);
        const y2 = cy + s.outerR * Math.sin(rad);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={s.width} />
            <circle
              cx={x2}
              cy={y2}
              r={s.nodeR}
              fill={s.fill ?? "none"}
              stroke={s.stroke}
              strokeWidth={s.fill ? 0 : 1.4}
            />
          </g>
        );
      })}
      {/* Center hub — filled gold */}
      <circle cx={cx} cy={cy} r={innerR} fill={gold} stroke="none" />
      <circle cx={cx} cy={cy} r={3} fill="none" stroke={white} strokeWidth={1.8} />
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
        <NexusHubIcon className="w-20 h-20" />
        <span className="font-bold text-sm tracking-[0.2em] text-ring text-center leading-tight mt-1 uppercase">
          Nexus
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
