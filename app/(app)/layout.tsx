import type { ReactNode } from "react";
import { BottomNav, SideRail } from "@/components/app/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1200px] lg:gap-12 lg:px-8">
        <SideRail />
        <div className="min-w-0 flex-1 pb-28 [--sticky-offset:5.25rem] lg:pb-16 lg:[--sticky-offset:0px]">
          <div className="shell px-5 lg:max-w-none lg:px-0">{children}</div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
