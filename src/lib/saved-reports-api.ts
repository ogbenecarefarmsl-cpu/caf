import apiClient from './api-client';

export type ReportSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SavedReport {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  reportKey: string;
  route: string;
  params: Record<string, unknown>;
  schedule: ReportSchedule;
  recipients: string[];
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportInput {
  name: string;
  description?: string;
  reportKey: string;
  route: string;
  params: Record<string, unknown>;
  schedule?: ReportSchedule;
  recipients?: string[];
}

export const savedReportsApi = {
  async list(): Promise<SavedReport[]> {
    const res = await apiClient.get<SavedReport[]>('/saved-reports');
    return res.data;
  },
  async create(input: CreateSavedReportInput): Promise<SavedReport> {
    const res = await apiClient.post<SavedReport>('/saved-reports', input);
    return res.data;
  },
  async update(id: string, patch: Partial<CreateSavedReportInput>): Promise<SavedReport> {
    const res = await apiClient.patch<SavedReport>(`/saved-reports/${id}`, patch);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/saved-reports/${id}`);
  },
};
