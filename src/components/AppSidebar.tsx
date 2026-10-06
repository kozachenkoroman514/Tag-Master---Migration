import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  BugIcon,
  SettingsIcon,
} from "./MenuIcons";
import tagMasterIcon from "@/assets/printer-icon.png";
import labelIcon from "@/assets/label-icon.png";

const DISABLED_PAGES = {
  bugReport: true,
  settings: true,
};

const TagMasterIcon = ({ className }: { className?: string }) => (
  <img
    src={tagMasterIcon}
    alt="Tag Master"
    className={`${className ?? ""} object-contain`}
  />
);

const LabelsMenuIcon = ({ className }: { className?: string }) => (
  <img
    src={labelIcon}
    alt="Labels"
    className={`${className ?? ""} object-contain`}
  />
);
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
    { to: "/", label: "Labels", icon: (a) => <LabelsMenuIcon className="w-11 h-11" /> },
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

      <nav className="flex flex-col gap-2 w-full px-2 mt-1 flex-1 min-h-0 overflow-y-auto sidebar-gold-scroll">
        {topItems.map(renderLink)}

        {(() => {
          const active = location.pathname.startsWith("/bug-report");
          if (DISABLED_PAGES.bugReport) {
            return (
              <div
                title="Bug Report — coming soon"
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center border-2 border-transparent text-accent-foreground/40 opacity-50 cursor-not-allowed"
              >
                <div className="relative">
                  <BugIcon className="w-11 h-11" active={false} />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-accent rounded-full p-0.5 border border-border/30">
                    <Lock className="w-2.5 h-2.5 text-ring" />
                  </div>
                </div>
                Bug Report
              </div>
            );
          }
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

        {(() => {
          const settingsItem = bottomItems[0];
          const active = location.pathname.startsWith(settingsItem.to);
          if (DISABLED_PAGES.settings) {
            return (
              <div
                title="Settings — coming soon"
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center border-2 border-transparent text-accent-foreground/40 opacity-50 cursor-not-allowed"
              >
                <div className="relative">
                  <SettingsIcon className="w-11 h-11" active={false} />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-accent rounded-full p-0.5 border border-border/30">
                    <Lock className="w-2.5 h-2.5 text-ring" />
                  </div>
                </div>
                Settings
              </div>
            );
          }
          return (
            <Link
              key={settingsItem.to}
              to={settingsItem.to}
              title={settingsItem.label}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center transition-all border-2 ${
                active
                  ? "border-ring text-accent-foreground"
                  : "border-transparent text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground"
              }`}
            >
              {settingsItem.icon(active)}
              {settingsItem.label}
            </Link>
          );
        })()}
      </nav>

      <div className="pb-4 pt-2 flex flex-col items-center w-full px-2">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-ring/40 to-transparent mb-3" />
        <ThemeToggle />
      </div>
    </aside>
  );
};

export default AppSidebar;
