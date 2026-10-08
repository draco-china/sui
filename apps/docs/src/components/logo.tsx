import type { ComponentProps } from "react";

/** A balanced yin-yang disc; the shared boundary draws a flowing S. */
export function Logo({
  markOnly = false,
  className,
  ...props
}: ComponentProps<"span"> & { markOnly?: boolean }) {
  return (
    <span className={`sui-logo ${className ?? ""}`} {...props}>
      <span className="sui-logo-symbol">
        <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <path
            d="M36 6a30 30 0 0 0 0 60a15 15 0 0 0 0-30a15 15 0 0 1 0-30Z"
            fill="currentColor"
          />
          <path
            className="sui-logo-cutout"
            d="M36 6a30 30 0 0 1 0 60a15 15 0 0 0 0-30a15 15 0 0 1 0-30Z"
          />
          <circle cx="36" cy="21" r="3.5" fill="currentColor" />
          <circle className="sui-logo-cutout" cx="36" cy="51" r="3.5" />
        </svg>
      </span>
      {markOnly ? null : <span className="sui-logo-wordmark">SUI</span>}
    </span>
  );
}
