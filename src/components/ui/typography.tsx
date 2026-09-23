import { ReactNode } from "react";

// Định nghĩa các kiểu cho variant
type Variant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

const variantClasses: Record<Variant, string> = {
  h1: "text-xl font-semibold tracking-tight",
  h2: "text-lg font-semibold tracking-tight",
  h3: "text-base font-semibold tracking-tight",
  h4: "text-sm font-semibold tracking-tight",
  h5: "text-sm font-medium tracking-tight",
  h6: "text-sm font-medium",
  p: "text-sm leading-6 text-muted-foreground",
  span: "text-sm font-normal",
};

// Định nghĩa kiểu cho props của Typography
interface TypographyProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

// Component Typography
function Typography({
  variant = "p",
  children,
  className,
  ...props
}: TypographyProps) {
  // Xác định thẻ HTML tương ứng dựa trên variant
  const Component = variant as keyof JSX.IntrinsicElements;
  const variantClass = variantClasses[variant]; // Lấy lớp CSS theo variant

  return (
    <Component className={`${variantClass} ${className} !mt-0`} {...props}>
      {children}
    </Component>
  );
}

export default Typography;
