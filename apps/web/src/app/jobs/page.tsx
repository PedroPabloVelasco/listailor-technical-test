import Link from 'next/link';
import { fetchJobs } from '@/lib/api/endpoints';

export default async function JobsPage() {
  const jobs = await fetchJobs();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Jobs</h1>

      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="border rounded p-4 hover:bg-muted transition"
          >
            <Link href={`/jobs/${job.id}`}>
              <div className="font-medium">{job.title}</div>
              <div className="text-sm text-muted-foreground">
                {job.description}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
