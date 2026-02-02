import { fetchCandidates } from '@/lib/api/endpoints';

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobCandidatesPage({ params }: PageProps) {
  const { jobId } = await params;
  const jobIdNumber = Number(jobId);

  const candidates = await fetchCandidates(jobIdNumber);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        Candidates for Job #{jobIdNumber}
      </h1>

      <ul className="space-y-2">
        {candidates.map((c) => (
          <li
            key={c.id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{c.candidateName}</div>
              <div className="text-sm text-muted-foreground">
                Stage: {c.stage}
              </div>
            </div>

            <a
              href={c.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              View CV
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
