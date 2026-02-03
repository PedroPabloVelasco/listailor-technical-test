import Link from 'next/link';

export function PageHeader({
  title,
  subtitle,
  backLink,
  actions,
}: {
  title: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        {backLink ? (
          <Link
            href={backLink.href}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-slate-600"
          >
            {backLink.label}
          </Link>
        ) : null}
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
