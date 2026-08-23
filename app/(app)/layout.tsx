import type { ReactNode } from "react";
import { BottomNav, SideRail, MainContent } from "@/components/app/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1200px] lg:gap-12 lg:px-8">
        <SideRail />
        <MainContent>{children}</MainContent>
      </div>
      <BottomNav />
    </>
  );
}
