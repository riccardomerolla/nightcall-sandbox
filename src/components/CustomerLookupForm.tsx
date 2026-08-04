"use client"

import { useRouter } from "next/navigation"
import { useId, useRef, useState, type FormEvent } from "react"

import styles from "./CustomerLookupForm.module.css"

const CUSTOMER_ID_PATTERN = /^C-\d{6}$/

const validateCustomerId = (value: string): string | null => {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return "Enter a customer ID."
  }

  if (!CUSTOMER_ID_PATTERN.test(trimmedValue)) {
    return "Enter a customer ID in the format C-000451."
  }

  return null
}

export function CustomerLookupForm() {
  const router = useRouter()
  const headingId = useId()
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [customerId, setCustomerId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationMessage = validateCustomerId(customerId)

    if (validationMessage) {
      setError(validationMessage)
      inputRef.current?.focus()
      return
    }

    setError(null)
    router.push("/customer")
  }

  return (
    <form
      aria-labelledby={headingId}
      className={styles.form}
      noValidate
      onSubmit={handleSubmit}
    >
      <h2 className={styles.heading} id={headingId}>
        Find a customer
      </h2>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          Customer ID
        </label>
        <input
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          aria-invalid={error ? "true" : undefined}
          autoComplete="off"
          className={styles.input}
          id={inputId}
          name="customerId"
          onChange={(event) => setCustomerId(event.target.value)}
          ref={inputRef}
          type="text"
          value={customerId}
        />
        <p className={styles.hint} id={hintId}>
          Format: C-000451
        </p>
        {error !== null ? (
          <p className={styles.error} id={errorId} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button className={styles.submit} type="submit">
        View customer dashboard
      </button>
    </form>
  )
}
