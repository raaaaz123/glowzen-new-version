import type { ReactNode } from "react";

/** Sticks to the bottom of the phone viewport, clearing the tab bar. */
export function StickyCta({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="sticky bottom-[var(--sticky-offset,0px)] z-30 -mx-5 mt-8 border-t border-line bg-linear-to-t from-ink via-ink to-ink/85 px-5 pt-4 pb-4 backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
      {children}
      {note && <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">{note}</p>}
    </div>
  );
}
