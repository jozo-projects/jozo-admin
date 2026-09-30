import { ReactNode } from "react";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

  const handleBack = () => {
    if (backUrl) {
      router.navigate({ to: backUrl as never });
    } else {
      router.history.back();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Icon className="size-4" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {showSeparator && <Separator className="mt-4" />}
    </div>
  );
}
