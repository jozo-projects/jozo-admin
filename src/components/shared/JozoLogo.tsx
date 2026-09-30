import { cn } from "@/lib/utils";

type JozoLogoProps = {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
};

export function JozoLogo({
  className,
  iconClassName,
  showText = true,
}: JozoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
          iconClassName,
        )}
      >
        <span className="text-lg font-bold leading-none">J</span>
      </div>
      {showText && (
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">Jozo</span>
          <span className="truncate text-xs text-muted-foreground">Admin</span>
        </div>
      )}
    </div>
  );
}
