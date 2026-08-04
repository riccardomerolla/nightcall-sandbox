import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode
} from "react"

import styles from "./Card.module.css"

type CardOwnProps<Element extends ElementType> = {
  readonly as?: Element
  readonly children?: ReactNode
  readonly className?: string
}

export type CardProps<Element extends ElementType = "div"> =
  CardOwnProps<Element> &
    Omit<ComponentPropsWithoutRef<Element>, keyof CardOwnProps<Element>>

export function Card<Element extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: CardProps<Element>) {
  const Component = as ?? "div"

  return (
    <Component
      className={[styles.card, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Component>
  )
}
