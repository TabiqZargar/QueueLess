import { forwardRef, HTMLAttributes } from "react";

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  filled?: boolean;
  weight?: number;
  grade?: number;
}

const sizeMap = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

const Icon = forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      className = "",
      name,
      size = "md",
      filled = false,
      weight,
      grade,
      ...props
    },
    ref
  ) => {
    const variation = filled ? "FILL" : "0";
    const style: React.CSSProperties = {};
    if (weight !== undefined) style.fontVariationSettings = `"wght" ${weight}`;
    if (grade !== undefined) {
      const existing = style.fontVariationSettings || "";
      style.fontVariationSettings = existing
        ? `${existing}, "GRAD" ${grade}`
        : `"GRAD" ${grade}`;
    }

    return (
      <span
        ref={ref}
        className={`material-symbols-outlined select-none ${sizeMap[size]} ${className}`}
        style={{ fontVariationSettings: `"FILL" ${variation}${weight !== undefined ? `, "wght" ${weight}` : ""}${grade !== undefined ? `, "GRAD" ${grade}` : ""}` }}
        aria-hidden="true"
        {...props}
      >
        {name}
      </span>
    );
  }
);

Icon.displayName = "Icon";

export { Icon };