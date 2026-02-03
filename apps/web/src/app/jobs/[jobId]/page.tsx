import { fetchCandidates, fetchJobs, fetchRubricConfig } from '@/lib/api/endpoints';
import { CandidatesTable } from '@/components/candidates-table';
import { PageHeader } from '@/components/page-header';

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function JobCandidatesPage({ params }: Props) {
  const { jobId } = await params;
  const jobIdNumber = Number(jobId);

  const [candidates, jobs, rubric] = await Promise.all([
    fetchCandidates(jobIdNumber),
    fetchJobs(),
    fetchRubricConfig(),
  ]);

  const job = jobs.find((j) => j.id === jobIdNumber);
  const jobTitle = job?.title ?? `Job ${jobIdNumber}`;

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title={jobTitle}
        subtitle="Gestiona el flujo de personas interesadas en este rol"
        backLink={{ href: '/jobs', label: '← Volver a roles' }}
        actions={
          <a
            href="/pipeline"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Ver resumen global
          </a>
        }
      />
      <CandidatesTable initial={candidates} rubric={rubric} />
    </main>
  );
}
