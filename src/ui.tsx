import { useEffect, useRef, type ReactNode } from "react";
export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    today: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4" />
      </>
    ),
    library: (
      <>
        <path d="M4 4h6v16H4zm10 0h6v16h-6zM7 8h0m10 0h0" />
      </>
    ),
    progress: (
      <>
        <path d="M4 20V10m8 10V4m8 16v-7M2 21h20" />
      </>
    ),
    gear: (
      <>
        <path d="m9 3-1 3-3 1-2 3 2 2v3l2 2 3 1 2 3 3-1 1-3 3-1 2-3-2-2v-3l-2-2-3-1-2-3z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M6 10v2a6 6 0 0 0 12 0v-2m-6 8v4m-4 0h8" />
      </>
    ),
    scan: (
      <>
        <path d="M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4M3 12h18" />
      </>
    ),
    food: (
      <>
        <path d="M5 3v7m3-7v7m-6-7v7a3 3 0 0 0 6 0m-3 3v9M18 3v19m0-19c-5 2-5 10 0 10" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 5 7 7-7 7" />,
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.food}
    </svg>
  );
}
export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const style = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      if (ref.current && viewport)
        ref.current.style.maxHeight = `${Math.max(160, viewport.height - 16)}px`;
    };
    resize();
    viewport?.addEventListener("resize", resize);
    const first = ref.current?.querySelector<HTMLElement>("button");
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const targets = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
          ) || []),
        ];
        const a = targets[0],
          b = targets.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b?.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = style;
      viewport?.removeEventListener("resize", resize);
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="backdrop">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <header className="sheet-head">
          <h2>{title}</h2>
          <button aria-label="Close" className="icon-button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </div>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="food" />
      <p>{children}</p>
    </div>
  );
}
export function Photo({ url, name }: { url?: string; name: string }) {
  return url ? (
    <img className="food-photo" src={url} alt={name} />
  ) : (
    <span className="food-placeholder">
      <Icon name="food" />
    </span>
  );
}

export function InputModeSwitch({
  mode,
  onChange,
}: {
  mode: "manual" | "automatic";
  onChange: (mode: "manual" | "automatic") => void;
}) {
  const automatic = mode === "automatic";
  return (
    <button
      type="button"
      className="input-mode-switch"
      aria-label={`Input mode: ${automatic ? "automatic" : "manual"}. Switch to ${automatic ? "manual" : "automatic"}.`}
      onClick={() => onChange(automatic ? "manual" : "automatic")}
    >
      <span aria-hidden="true">↻</span>
      {automatic ? "Automatic" : "Manual"}
    </button>
  );
}
