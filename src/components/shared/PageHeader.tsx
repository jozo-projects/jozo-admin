import { ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PageHeaderTargetContext } from "@/components/Layout/page-header-context";

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  showBackButton?: boolean;
  backUrl?: string;
  className?: string;
  showSeparator?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  showBackButton = false,
  backUrl,
  className,
  showSeparator = true,
}: PageHeaderProps) {
  const router = useRouter();
  const headerTarget = useContext(PageHeaderTargetContext);

  const handleBack = () => {
    if (backUrl) {
      router.navigate({ to: backUrl as never });
    } else {
      router.history.back();
    }
  };

  const titleContent = (
        <div className="flex min-w-0 items-center gap-2">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="size-9 shrink-0"
              aria-label="Quay lại"
            >
              <ArrowLeft />
            </Button>
          )}

          {Icon && (
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground sm:flex">
              <Icon className="size-4" />
            </div>
          )}

          <div className="min-w-0">
            <h1 title={title} className="truncate text-base font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>
  );

  return (
    <>
      {headerTarget && createPortal(titleContent, headerTarget)}
      {(!headerTarget || description || actions) && (
        <div className={cn("w-full", className)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!headerTarget && titleContent}
            {description && (
              <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            )}
        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0">
            {actions}
          </div>
        )}
          </div>

          {showSeparator && <Separator className="mt-4" />}
        </div>
      )}
    </>
  );
}
