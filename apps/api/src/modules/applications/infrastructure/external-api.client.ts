import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';

export type ExternalJob = {
  id: number;
  title: string;
  description: string;
};

export type ExternalAnswer = {
  question: string;
  value: string;
};

export type ExternalApplication = {
  id: number;
  candidate_name: string;
  job_id: number;
  cv_url: string;
  answers: ExternalAnswer[];
};

type JobsResponse = { total: number; jobs: ExternalJob[] };
type ApplicationsResponse = {
  total: number;
  applications: ExternalApplication[];
};

@Injectable()
export class ExternalApiClient {
  private readonly logger = new Logger(ExternalApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly http: HttpService) {
    this.baseUrl =
      process.env.LISTAILOR_API_BASE_URL ??
      'https://listailor-web.onrender.com';
    this.token = process.env.LISTAILOR_API_TOKEN ?? 'velasco';
  }

  async fetchJobs(): Promise<ExternalJob[]> {
    const url = `${this.baseUrl}/api/v1/technical_test/jobs`;
    this.logger.log(`Fetching jobs: ${url}`);

    const res = await firstValueFrom(
      this.http
        .get<JobsResponse>(url, {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        .pipe(timeout(15_000)),
    );

    this.logger.log(`Fetched jobs: ${res.data.jobs?.length ?? 0}`);
    return res.data.jobs ?? [];
  }

  async fetchApplications(): Promise<ExternalApplication[]> {
    const url = `${this.baseUrl}/api/v1/technical_test/applications`;
    this.logger.log(`Fetching applications: ${url}`);

    const res = await firstValueFrom(
      this.http
        .get<ApplicationsResponse>(url, {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        .pipe(timeout(25_000)),
    );

    this.logger.log(
      `Fetched applications: ${res.data.applications?.length ?? 0}`,
    );
    return res.data.applications ?? [];
  }
}
