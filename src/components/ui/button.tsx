import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl font-medium focus-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700",
      secondary:
        "border border-outline bg-white text-on-surface hover:bg-surface-container",
      danger: "bg-danger-600 text-white hover:bg-danger-700",
      ghost: "text-on-surface hover:bg-surface-container",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };