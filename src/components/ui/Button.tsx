import { forwardRef, type ButtonHTMLAttributes } from "react"

import styles from "./Button.module.css"

export type ButtonVariant = "primary" | "secondary" | "danger"
export type ButtonSize = "small" | "medium" | "large"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      size = "medium",
      variant = "primary",
      ...props
    },
    ref
  ) => (
    <button
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = "Button"
