'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type JobCardData = {
  id: number;
  title: string;
  description: string;
  preview: string;
  applicants: number;
};

type ApplicantFilter = 'all' | 'none' | 'focus' | 'heavy';
type RoleFilter = 'all' | 'tech' | 'business';
type SortMode = 'title_asc' | 'title_desc' | 'applicants_desc' | 'applicants_asc';

type Props = {
  jobs: JobCardData[];
};

const applicantFilters: Array<{
  value: ApplicantFilter;
  label: string;
  helper: string;
}> = [
  { value: 'all', label: 'Todos los candidatos', helper: 'Cualquier tamaño' },
  { value: 'none', label: 'Sin personas', helper: '0 en proceso' },
  { value: 'focus', label: 'Revisión rápida', helper: '1 a 5 personas' },
  { value: 'heavy', label: 'Alta demanda', helper: '6+ personas' },
];

const roleFilters: Array<{
  value: RoleFilter;
  label: string;
  helper: string;
}> = [
  { value: 'all', label: 'Todos los roles', helper: 'Sin distinción' },
  { value: 'tech', label: 'Perfiles técnicos', helper: 'Engineer, Dev, Data…' },
  { value: 'business', label: 'Perfiles business', helper: 'Ops, Finance, Sales…' },
];

const applicantsLabel = (count: number) =>
  count === 0
    ? 'Sin personas en proceso'
    : `${count} ${count === 1 ? 'persona' : 'personas'} en flujo`;

const getRoleCategory = (job: JobCardData): RoleFilter => {
  const techKeywords = /(engineer|developer|software|security|data|tech|devops)/i;
  if (techKeywords.test(job.title) || techKeywords.test(job.description)) {
    return 'tech';
  }
  return 'business';
};

const matchesApplicantFilter = (count: number, filter: ApplicantFilter) => {
  switch (filter) {
    case 'none':
      return count === 0;
    case 'focus':
      return count >= 1 && count <= 5;
    case 'heavy':
      return count >= 6;
    default:
      return true;
  }
};

export function JobsList({ jobs }: Props) {
  const [query, setQuery] = useState('');
  const [countFilter, setCountFilter] = useState<ApplicantFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('applicants_desc');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      if (!matchesApplicantFilter(job.applicants, countFilter)) {
        return false;
      }

      const roleCategory = getRoleCategory(job);
      if (roleFilter !== 'all' && roleFilter !== roleCategory) {
        return false;
      }

      if (normalizedQuery.length > 0) {
        const haystack = `${job.title} ${job.preview}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'applicants_asc':
          return a.applicants - b.applicants;
        case 'applicants_desc':
        default:
          return b.applicants - a.applicants;
      }
    });
    return sorted;
  }, [jobs, countFilter, roleFilter, normalizedQuery, sortMode]);

  return (
    <section>
      <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Buscar
          </label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cargo o palabra clave"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Personas en flujo
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {applicantFilters.map((option) => {
              const active = countFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? 'border-blue-400 bg-blue-50 text-blue-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                  }`}
                  onClick={() => setCountFilter(option.value)}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-slate-500">{option.helper}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Tipo de rol
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {roleFilters.map((option) => {
              const active = roleFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-purple-400 bg-purple-50 text-purple-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200'
                  }`}
                  onClick={() => setRoleFilter(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{roleFilters.find((r) => r.value === roleFilter)?.helper}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Ordenar por
          </p>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="applicants_desc">Más personas en flujo</option>
            <option value="applicants_asc">Menos personas en flujo</option>
            <option value="title_asc">Título A → Z</option>
            <option value="title_desc">Título Z → A</option>
          </select>
        </div>
      </div>

      <div className="space-y-5">
        {filteredJobs.map((job) => (
          <article
            key={job.id}
            className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg"
          >
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {applicantsLabel(job.applicants)}
                  </span>
                </div>
              </div>
              <Link
                href={`/jobs/${job.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                prefetch={false}
              >
                Ver candidatos
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <details className="group mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700">
                <span>Ver descripción completa</span>
                <svg
                  className="h-4 w-4 text-slate-500 transition group-open:rotate-90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div
                className="mt-4 text-sm leading-relaxed text-slate-700 space-y-3 [&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-slate-900 [&>strong]:font-semibold [&>a]:text-blue-600"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </details>
          </article>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center">
          <p className="text-base font-semibold text-slate-800">
            No encontramos roles para esos filtros.
          </p>
            <p className="mt-2 text-sm text-slate-600">
              Ajusta la búsqueda o cambia los rangos de personas en seguimiento.
            </p>
        </div>
      )}
    </section>
  );
}
