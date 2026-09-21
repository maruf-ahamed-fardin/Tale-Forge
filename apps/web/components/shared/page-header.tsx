export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl min-w-0">
        {eyebrow ? <p className="mb-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">{eyebrow}</p> : null}
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl lg:text-4xl break-words">{title}</h1>
        {description ? <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{children}</div> : null}
    </div>
  );
}
