import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Init from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Sun className="w-4 h-4 text-amber-400" />
      <SwitchPrimitives.Root
        checked={dark}
        onCheckedChange={setDark}
        className="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SwitchPrimitives.Thumb
          className="pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-all duration-300 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-ring data-[state=checked]:bg-[hsl(0,0%,9%)]"
        />
      </SwitchPrimitives.Root>
      <Moon className="w-4 h-4 text-slate-400" />
    </div>
  );
};

export default ThemeToggle;
