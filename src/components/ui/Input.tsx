import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode
} from "react"

import styles from "./Input.module.css"

export type InputValidationState = "valid" | "invalid"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: ReactNode
  readonly helperText?: ReactNode
  readonly errorMessage?: ReactNode
  readonly validationState?: InputValidationState
}

const joinIds = (...ids: Array<string | undefined>) =>
  ids.filter((id): id is string => Boolean(id)).join(" ") || undefined

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      "aria-invalid": ariaInvalid,
      className,
      disabled,
      errorMessage,
      helperText,
      id,
      label,
      validationState,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id ?? `input-${generatedId}`
    const helperId = helperText ? `${inputId}-helper` : undefined
    const errorId = errorMessage ? `${inputId}-error` : undefined
    const resolvedValidationState = errorMessage
      ? "invalid"
      : validationState
    const describedBy = joinIds(ariaDescribedBy, helperId, errorId)
    const invalid = errorMessage ? true : ariaInvalid

    return (
      <div
        className={[
          styles.field,
          disabled ? styles.disabled : undefined,
          resolvedValidationState
            ? styles[resolvedValidationState]
            : undefined
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <input
          aria-describedby={describedBy}
          aria-errormessage={errorId ?? ariaErrorMessage}
          aria-invalid={
            resolvedValidationState === "invalid" ? true : invalid
          }
          className={[styles.input, className].filter(Boolean).join(" ")}
          disabled={disabled}
          id={inputId}
          ref={ref}
          {...props}
        />
        {helperText ? (
          <span className={styles.helper} id={helperId}>
            {helperText}
          </span>
        ) : null}
        {errorMessage ? (
          <span className={styles.error} id={errorId}>
            {errorMessage}
          </span>
        ) : null}
      </div>
    )
  }
)

Input.displayName = "Input"
