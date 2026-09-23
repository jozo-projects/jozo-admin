import { LucideIcon } from "lucide-react";
import { HTMLAttributes, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClassName = {
  default: "text-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
} as const;

export type StatTone = keyof typeof toneClassName;

export function StatGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
      {...props}
    />
  );
}

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  onClick,
  ...props
}: StatCardProps) {
  const toneClass = toneClassName[tone];

  return (
    <Card
      className={cn(
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon ? (
          <Icon
            className={cn(
              "size-4",
              tone === "default" ? "text-muted-foreground" : toneClass,
            )}
          />
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            toneClass,
          )}
        >
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
