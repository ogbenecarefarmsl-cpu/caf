import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { unwrapResponse } from '../../lib/unwrap-response';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { useToast } from '../../hooks/useToast';

const CycleCountStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
} as const;
type CycleCountStatus = typeof CycleCountStatus[keyof typeof CycleCountStatus];

interface CycleCountLine {
  productId: { _id: string; name: string; sku: string } | string;
  // Legacy backend field name; now represents the product-level count line id.
  batchId: string;
  lotNumber: string;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number | null;
}

interface CycleCount {
  _id: string;
  branchId: string;
  status: CycleCountStatus;
  lines: CycleCountLine[];
  notes?: string;
  createdBy: { _id: string; firstName: string; lastName: string };
  approvedBy?: { _id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<CycleCountStatus, string> = {
  [CycleCountStatus.DRAFT]: 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/20',
  [CycleCountStatus.SUBMITTED]: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  [CycleCountStatus.APPROVED]: 'bg-green-500/15 text-green-300 border border-green-500/20',
  [CycleCountStatus.CANCELLED]: 'bg-white/10 text-gray-300 border border-white/10',
};

function StatusBadge({ status }: { status: CycleCountStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}

export function CycleCountPage() {
  const [selectedCount, setSelectedCount] = useState<CycleCount | null>(null);
  const [countedValues, setCountedValues] = useState<Record<string, number>>({});
  const { selectedBranch } = useBranchStore();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const branchId = getBranchId(selectedBranch);

  const { data: cycleCounts, isLoading, error } = useQuery({
    queryKey: queryKeys.cycleCounts.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/cycle-counts', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as CycleCount[];
    },
    enabled: !!selectedBranch,
  });

  const { data: countDetail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.cycleCounts.detail(selectedCount?._id ?? ''),
    queryFn: async () => {
      const response = await apiClient.get(`/cycle-counts/${selectedCount!._id}`);
      return (response.data?.data ?? response.data) as CycleCount;
    },
    enabled: !!selectedCount,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/cycle-counts', { branchId });
      return unwrapResponse(response.data, {} as CycleCount);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.lists() });
      showSuccess('Cycle count draft created');
      setSelectedCount(data);
      setCountedValues({});
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message ?? 'Failed to create cycle count');
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ id, lines }: { id: string; lines: { batchId: string; countedQuantity: number }[] }) => {
      const response = await apiClient.patch(`/cycle-counts/${id}/submit`, { lines });
      return unwrapResponse(response.data, {} as CycleCount);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.detail(data._id) });
      showSuccess('Cycle count submitted for review');
      setSelectedCount(data);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message ?? 'Failed to submit cycle count');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/cycle-counts/${id}/approve`);
      return unwrapResponse(response.data, {} as CycleCount);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.detail(data._id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all(), exact: false });
      showSuccess('Cycle count approved - product stock levels adjusted');
      setSelectedCount(data);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message ?? 'Failed to approve cycle count');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/cycle-counts/${id}/cancel`);
      return unwrapResponse(response.data, {} as CycleCount);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.detail(data._id) });
      showSuccess('Cycle count cancelled');
      setSelectedCount(data);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message ?? 'Failed to cancel cycle count');
    },
  });

  function handleSubmitCount() {
    if (!selectedCount) return;
    const lines = (countDetail?.lines ?? []).map((line) => ({
      batchId: line.batchId,
      countedQuantity: countedValues[line.batchId] ?? line.systemQuantity,
    }));
    submitMutation.mutate({ id: selectedCount._id, lines });
  }

  const activeDetail = countDetail ?? selectedCount;

  // --- Detail view ----------------------------------------------------------
  if (selectedCount) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center gap-3 mb-6">
            <button
              className="text-sm text-accent-green hover:underline"
              onClick={() => setSelectedCount(null)}
            >
              Back to list
            </button>
            <h1 className="text-xl font-bold text-white">
              Cycle Count - {activeDetail?.status && <StatusBadge status={activeDetail.status} />}
            </h1>
          </div>

          {detailLoading && <Loading />}

          {activeDetail && (
            <>
              <div className="mb-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <table className="w-full text-sm">
                  <thead className="bg-primary-darker text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-right">System Qty</th>
                      <th className="px-4 py-3 text-right">Counted Qty</th>
                      {activeDetail.status !== CycleCountStatus.DRAFT && (
                        <th className="px-4 py-3 text-right">Variance</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-gray-200">
                    {activeDetail.lines.map((line) => {
                      const productName =
                        typeof line.productId === 'object'
                          ? line.productId.name
                          : line.productId;
                      const productSku =
                        typeof line.productId === 'object'
                          ? line.productId.sku
                          : '-';
                      const variance = line.variance;

                      return (
                        <tr key={line.batchId} className="hover:bg-white/5">
                          <td className="px-4 py-3">{productName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{productSku}</td>
                          <td className="px-4 py-3 text-right">{line.systemQuantity}</td>
                          <td className="px-4 py-3 text-right">
                            {activeDetail.status === CycleCountStatus.DRAFT ? (
                              <input
                                type="number"
                                min={0}
                                defaultValue={line.systemQuantity}
                                className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-sm text-white focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
                                onChange={(e) =>
                                  setCountedValues((prev) => ({
                                    ...prev,
                                    [line.batchId]: Number(e.target.value),
                                  }))
                                }
                              />
                            ) : (
                              line.countedQuantity ?? '-'
                            )}
                          </td>
                          {activeDetail.status !== CycleCountStatus.DRAFT && (
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                variance == null
                                  ? ''
                                  : variance > 0
                                  ? 'text-green-600'
                                  : variance < 0
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {variance == null
                                ? '-'
                                : variance > 0
                                ? `+${variance}`
                                : variance}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end">
                {activeDetail.status === CycleCountStatus.DRAFT && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => cancelMutation.mutate(selectedCount._id)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel Count
                    </Button>
                    <Button
                      onClick={handleSubmitCount}
                      disabled={submitMutation.isPending}
                    >
                      Submit for Review
                    </Button>
                  </>
                )}
                {activeDetail.status === CycleCountStatus.SUBMITTED && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => cancelMutation.mutate(selectedCount._id)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel Count
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedCount._id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve &amp; Apply Adjustments
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    );
  }

  // --- List view ------------------------------------------------------------
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Cycle Counts</h1>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !selectedBranch}
          >
            + Start New Count
          </Button>
        </div>

        {!selectedBranch && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            Select a branch to view or start cycle counts.
          </div>
        )}

        {isLoading && <Loading />}
        {error && <Error message="Failed to load cycle counts" />}

        {cycleCounts && cycleCounts.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-12">
            No cycle counts yet. Start one to reconcile physical stock.
          </div>
        )}

        {cycleCounts && cycleCounts.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <Table
              columns={[
                {
                  key: 'createdAt',
                  header: 'Date',
                  render: (row: CycleCount) =>
                    new Date(row.createdAt).toLocaleDateString(),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row: CycleCount) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'lines',
                  header: 'Lines',
                  render: (row: CycleCount) => row.lines.length,
                },
                {
                  key: 'createdBy',
                  header: 'Created By',
                  render: (row: CycleCount) =>
                    `${row.createdBy.firstName} ${row.createdBy.lastName}`,
                },
                {
                  key: 'actions',
                  header: '',
                  render: (row: CycleCount) =>
                    row.status !== CycleCountStatus.CANCELLED &&
                    row.status !== CycleCountStatus.APPROVED ? (
                      <button
                        className="text-accent-green hover:underline text-sm"
                        onClick={() => {
                          setSelectedCount(row);
                          setCountedValues({});
                        }}
                      >
                        {row.status === CycleCountStatus.DRAFT ? 'Enter Counts' : 'Review'}
                      </button>
                    ) : (
                      <button
                        className="text-gray-500 hover:underline text-sm"
                        onClick={() => {
                          setSelectedCount(row);
                          setCountedValues({});
                        }}
                      >
                        View
                      </button>
                    ),
                },
              ]}
              data={cycleCounts}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
