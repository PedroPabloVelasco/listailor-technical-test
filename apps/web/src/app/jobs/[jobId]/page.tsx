import { fetchCandidates } from '@/lib/api/endpoints';
import { CandidatesTable } from '@/components/candidates-table';

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function JobCandidatesPage({ params }: Props) {
  const { jobId } = await params;
  const jobIdNumber = Number(jobId);

  const candidates = await fetchCandidates(jobIdNumber);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Candidates for Job #{jobIdNumber}</h1>
      <CandidatesTable initial={candidates} />
    </main>
  );
}
