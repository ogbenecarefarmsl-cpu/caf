import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { unwrapArray, unwrapResponse } from '../../lib/unwrap-response';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface Job {
  _id: string;
  name: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'delayed';
  data: Record<string, unknown>;
  progress?: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export const JobsMonitoringPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch jobs
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.jobs.list({ status: statusFilter, type: typeFilter }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/jobs', {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }));
      return unwrapArray<Job>(response.data);
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch queue stats
  const { data: stats } = useQuery({
    queryKey: queryKeys.jobs.stats(),
    queryFn: async () => {
      const response = await apiClient.get('/jobs/stats');
      return unwrapResponse(response.data, {} as QueueStats);
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load jobs" /></AdminLayout>;

  const columns = [
    { key: 'name', header: 'Job Name' },
    {
      key: 'type',
      header: 'Type',
      render: (job: Job) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
          {job.type}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (job: Job) => {
        const statusColors = {
          pending: 'bg-white/10 text-white/60',
          active: 'bg-blue-500/20 text-blue-300',
          completed: 'bg-green-500/20 text-green-300',
          failed: 'bg-red-500/20 text-red-300',
          delayed: 'bg-yellow-500/20 text-yellow-300',
        };
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[job.status]}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (job: Job) => (
        job.progress !== undefined ? (
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-blue-400 h-2 rounded-full"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        ) : (
          'N/A'
        )
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (job: Job) => `${job.attempts} / ${job.maxAttempts}`,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (job: Job) => new Date(job.createdAt).toLocaleString(),
    },
    {
      key: 'completedAt',
      header: 'Completed',
      render: (job: Job) => job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A',
    },
    {
      key: 'error',
      header: 'Error',
      render: (job: Job) => (
        job.error ? (
          <span className="text-red-600 text-xs truncate max-w-xs block" title={job.error}>
            {job.error}
          </span>
        ) : (
          'N/A'
        )
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Jobs Monitoring</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-accent-green focus:ring-accent-green/50 border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-300">Auto-refresh (5s)</span>
            </label>
            <Button onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Queue Statistics */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-primary-dark/50 p-4 rounded-lg shadow border border-white/10">
              <p className="text-sm text-gray-500">Waiting</p>
              <p className="text-2xl font-bold text-white">{stats.waiting}</p>
            </div>
            <div className="bg-primary-dark/50 p-4 rounded-lg shadow border border-white/10">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-accent-green">{stats.active}</p>
            </div>
            <div className="bg-primary-dark/50 p-4 rounded-lg shadow border border-white/10">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-primary-dark/50 p-4 rounded-lg shadow border border-white/10">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="bg-primary-dark/50 p-4 rounded-lg shadow border border-white/10">
              <p className="text-sm text-gray-500">Delayed</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.delayed}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="delayed">Delayed</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="report">Report</option>
            <option value="inventory">Inventory</option>
            <option value="backup">Backup</option>
          </Select>
        </div>

        {/* Jobs Table */}
        <div className="bg-primary-dark/50 rounded-lg shadow border border-white/10">
          <Table
            data={jobs || []}
            columns={columns}
          />
        </div>
      </div>
    </AdminLayout>
  );
};
