import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  currency?: boolean;
  as?: React.ElementType;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      prefix,
      suffix,
      currency,
      maxLength,
      as: Component = "input",
      onChange,
      ...props
    },
    ref
  ) => {
    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;

    // Handle number input with maxLength and currency formatting
    const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/[^\d]/g, ""); // Remove non-digits

      // Apply maxLength if specified
      if (maxLength && value.length > maxLength) {
        value = value.slice(0, maxLength);
      }

      // Format with thousand separators if currency is true
      if (currency) {
        value = value
          ? parseInt(value).toLocaleString("en-US").replace(/,/g, ".")
          : "";
      }

      // Create new synthetic event
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: value,
        },
      };

      onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    };

    // Use modified props for number input only
    const inputProps =
      type === "number"
        ? {
            ...props,
            onChange: handleNumberInput,
            type: "text",
            inputMode:
              "numeric" as React.InputHTMLAttributes<HTMLInputElement>["inputMode"],
          }
        : {
            ...props,
            onChange, // Pass through original onChange for non-number types
            type,
          };

    return (
      <div className="relative flex items-center">
        {hasPrefix && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center rounded-l-md pointer-events-none">
            {prefix}
          </div>
        )}

        <Component
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            hasPrefix ? "pl-10" : "pl-3",
            hasSuffix ? "pr-10" : "pr-3",
            className
          )}
          ref={ref}
          {...inputProps}
        />

        {hasSuffix && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center rounded-r-md pointer-events-none">
            {React.cloneElement(suffix as React.ReactElement<{ className?: string }>, {
              className: "pointer-events-auto",
            })}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
