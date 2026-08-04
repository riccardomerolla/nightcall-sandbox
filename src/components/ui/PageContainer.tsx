import type { HTMLAttributes } from "react"

import styles from "./PageContainer.module.css"

type PageContainerElement = "div" | "main" | "section"
type PageContainerWidth = "narrow" | "default" | "wide"

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  readonly as?: PageContainerElement
  readonly width?: PageContainerWidth
}

export function PageContainer({
  as: Element = "div",
  children,
  className,
  width = "wide",
  ...props
}: PageContainerProps) {
  return (
    <Element
      className={[styles.container, styles[width], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Element>
  )
}
