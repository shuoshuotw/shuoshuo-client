"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { failureMessage, fieldMessages } from "@/lib/api/client";

type FieldProps = { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined };

type Props = {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: (props: FieldProps) => ReactNode;
};

export function Field({ label, error, hint, children }: Props) {
  const id = useId();
  const described = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field" data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": described })}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * M-15: fields shake, their messages appear and focus moves to the first bad one.
 * `codes` names the field a whole-request error belongs to, such as USERNAME_TAKEN.
 */
export function useFormErrors(codes: Record<string, string> = {}) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0 || !form.current) return;
    const invalid = form.current.querySelectorAll<HTMLElement>('[data-invalid="true"]');
    invalid.forEach((field) => {
      field.classList.remove("field-shake");
      // Restarts the animation when the same field fails twice
      void field.offsetWidth;
      field.classList.add("field-shake");
    });
    invalid[0]?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [attempt]);

  const fail = useCallback((fields: Record<string, string>) => {
    setErrors(fields);
    setFormError(null);
    setAttempt((value) => value + 1);
  }, []);

  const failWith = (failure: unknown) => {
    const code = (failure as { code?: string }).code;
    const field = code ? codes[code] : undefined;
    const fields = field ? { [field]: failureMessage(failure) } : fieldMessages(failure);
    if (Object.keys(fields).length > 0) fail(fields);
    else {
      setErrors({});
      setFormError(failureMessage(failure));
    }
  };

  const clear = () => {
    setErrors({});
    setFormError(null);
  };

  return { form, errors, formError, fail, failWith, clear };
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}
