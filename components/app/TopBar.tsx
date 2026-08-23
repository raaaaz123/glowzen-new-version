"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

export function TopBar({
  title,
  action,
  back = true,
  sticky = true,
}: {
  title?: string;
  action?: ReactNode;
  back?: boolean;
  sticky?: boolean;
}) {
  const router = useRouter();
  const t = useT();

  return (
    <header
      className={cn(
        "safe-t z-40 flex items-center gap-3 py-3",
        sticky && "sticky top-0 -mx-5 border-b border-line/70 bg-ink/80 px-5 backdrop-blur-xl lg:mx-0 lg:px-0",
      )}
    >
      {back && (
        <button
          onClick={() => router.back()}
          aria-label={t("common.goBack")}
          className="-ms-2 grid size-10 shrink-0 place-items-center rounded-full text-cream transition-colors hover:bg-raised"
        >
          {/* Back points the way the reader came from, which flips with the script. */}
          <ChevronLeft className="size-5 rtl:-scale-x-100" />
        </button>
      )}
      {title && <h1 className="flex-1 truncate text-[15px] font-medium">{title}</h1>}
      {!title && <span className="flex-1" />}
      {action}
    </header>
  );
}
