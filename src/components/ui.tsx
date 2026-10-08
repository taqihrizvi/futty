import Link from "next/link";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
}) {
  return (
    <header className="mb-space-lg">
      {eyebrow ? (
        <p className="text-label-sm text-primary uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="text-headline-xl text-on-surface">{title}</h1>
      {detail ? <p className="mt-1 text-on-surface-variant">{detail}</p> : null}
    </header>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "min-h-11 shrink-0 rounded-lg px-3 text-label-md",
        className,
        active
          ? "bg-surface-container-lowest text-primary shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-headline-md text-on-surface">{title}</h2>
      {href && action ? (
        <Link href={href} className="text-label-md text-primary">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-surface-container-lowest px-4 py-5 text-on-surface-variant shadow-sm">
      {children}
    </p>
  );
}

export function Avatar({ name }: { name: string }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-fixed text-label-lg text-on-primary-fixed"
    >
      {letters}
    </span>
  );
}
