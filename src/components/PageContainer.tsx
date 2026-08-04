import type { HTMLAttributes } from "react"

import styles from "./PageContainer.module.css"

type PageContainerElement = "div" | "main" | "section"
type PageContainerWidth = "narrow" | "default" | "wide"

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  readonly as?: PageContainerElement
  readonly width?: PageContainerWidth
}

export const PageContainer = ({
  as: Element = "div",
  children,
  className,
  width = "wide",
  ...props
}: PageContainerProps) => (
  <Element
    className={[styles.container, styles[width], className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
  </Element>
)
