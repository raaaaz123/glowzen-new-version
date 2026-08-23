"use client";

import { RotateCw, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/I18nContext";
import type { EmptyError } from "@/lib/emptyError";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-6 py-12 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-raised text-champagne">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();

  return (
    <div className="rounded-card border border-danger/25 bg-danger-bg/6 px-5 py-6 text-center">
      <p className="text-sm leading-relaxed text-danger-soft">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        <RotateCw className="size-3.5" aria-hidden />
        {t("common.tryAgain")}
      </Button>
    </div>
  );
}

/** Renders an EmptyError from useAsync — an invitation, not a failure. */
export function NothingYet({ empty, title }: { empty: EmptyError; title: string }) {
  return (
    <EmptyState
      icon={Sparkles}
      title={title}
      body={empty.message}
      action={
        empty.action && (
          <ButtonLink href={empty.action.href} size="md">
            {empty.action.label}
          </ButtonLink>
        )
      }
    />
  );
}
