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
    <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p> : null}
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight break-words">{title}</h1>
        {description ? <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0 w-full sm:w-auto">{children}</div> : null}
    </div>
  );
}
