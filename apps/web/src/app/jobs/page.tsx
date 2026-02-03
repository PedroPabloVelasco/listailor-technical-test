import { fetchJobs, fetchCandidates } from '@/lib/api/endpoints';
import { JobsList, type JobCardData } from '@/components/jobs/jobs-list';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default async function JobsPage() {
  const jobs = await fetchJobs();
  const jobsWithApplicants: JobCardData[] = await Promise.all(
    jobs.map(async (job) => {
      const candidates = await fetchCandidates(job.id);
      return {
        ...job,
        applicants: candidates.length,
        preview: stripHtml(job.description),
      };
    })
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          title="Procesos abiertos"
          subtitle="Revisa la información clave de cada rol y monitorea cuántas personas siguen en tu flujo de evaluación."
          actions={
            <Link
              href="/pipeline"
              className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm"
            >
              Ver resumen global
            </Link>
          }
        />

        <JobsList jobs={jobsWithApplicants} />

        {jobsWithApplicants.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
            <p className="text-lg font-semibold text-slate-800">No hay posiciones activas.</p>
            <p className="mt-2 text-sm text-slate-600">
              Sincroniza con tu ATS o vuelve a intentarlo más tarde.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
