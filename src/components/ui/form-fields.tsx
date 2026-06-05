import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared form field primitives used by every Create/Edit form in the app.
 * Kept as uncontrolled inputs so Server Actions can read directly from
 * FormData without a form library in the middle.
 */

const baseInput =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"

export function FormLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  )
}

export function FormHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  hint,
  inputProps,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  hint?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel htmlFor={name} required={required}>
        {label}
      </FormLabel>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        {...inputProps}
        className={cn(baseInput, inputProps?.className)}
      />
      {hint ? <FormHint>{hint}</FormHint> : null}
    </div>
  )
}

export function SelectField({
  label,
  name,
  required,
  children,
  defaultValue,
  value,
  onChange,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel htmlFor={name} required={required}>
        {label}
      </FormLabel>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange}
        className={cn(baseInput, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9")}
      >
        {children}
      </select>
      {hint ? <FormHint>{hint}</FormHint> : null}
    </div>
  )
}

export function TextareaField({
  label,
  name,
  required,
  rows = 3,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  rows?: number
  defaultValue?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel htmlFor={name} required={required}>
        {label}
      </FormLabel>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        className={cn(baseInput, "resize-y")}
      />
      {hint ? <FormHint>{hint}</FormHint> : null}
    </div>
  )
}

export function FileField({
  label,
  name,
  accept,
  hint,
}: {
  label: string
  name: string
  accept?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <FormLabel htmlFor={name}>{label}</FormLabel>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
      />
      {hint ? <FormHint>{hint}</FormHint> : null}
    </div>
  )
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: React.ReactNode
  name: string
  defaultChecked?: boolean
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-input"
      />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
      {message}
    </div>
  )
}
