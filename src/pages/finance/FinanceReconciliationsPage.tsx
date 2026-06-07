import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceLayout } from '../../components/FinanceLayout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import apiClient from '../../lib/api-client';
import { buildApiUrl } from '../../lib/api-utils';
import { getErrorMessage } from '../../lib/error-utils';
import { CheckCircle, XCircle, Eye, Plus, Trash2 } from 'lucide-react';

interface Reconciliation {
  _id: string;
  source: string;
  period: string;
  totalSales: number;
  totalExpenses: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  hasDiscrepancy: boolean;
  status: string;
  items: { description: string; amount: number; reference?: string }[];
  createdBy: { firstName: string; lastName: string };
  reviewedBy?: { firstName: string; lastName: string };
  reviewNotes?: string;
  createdAt: string;
}

function formatMoney(amount: number) {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusBadge = (status: string) => {
  const s: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return s[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const sourceBadge = (source: string) => {
  const s: Record<string, string> = {
    caf: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emr: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    lab: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };
  return s[source] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

export function FinanceReconciliationsPage() {
  const [selected, setSelected] = useState<Reconciliation | null>(null);
  const [reviewModal, setReviewModal] = useState<Reconciliation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    source: 'caf' | 'emr' | 'lab';
    period: string;
    actualCash: string;
    notes: string;
  }>({ source: 'caf', period: '', actualCash: '', notes: '' });
  const { selectedBranch } = useBranchStore();
  const branchId = getBranchId(selectedBranch);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data: recons, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.financeManager.reconciliations.list({ branchId }),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/reconciliations', { branchId }));
      return (res.data?.data ?? res.data) as Reconciliation[];
    },
    enabled: !!branchId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      await apiClient.patch(`/finance-manager/reconciliations/${id}/review`, { status, reviewNotes: notes });
    },
    onSuccess: () => {
      showSuccess('Reconciliation reviewed');
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.reconciliations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.dashboard(branchId) });
      setReviewModal(null);
      setReviewNotes('');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Review failed'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/finance-manager/reconciliations', {
        branchId,
        source: createForm.source,
        period: createForm.period,
        actualCash: Number(createForm.actualCash),
        notes: createForm.notes || undefined,
      });
    },
    onSuccess: () => {
      showSuccess('Reconciliation created');
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.reconciliations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.dashboard(branchId) });
      setIsCreateOpen(false);
      setCreateForm({ source: 'caf', period: '', actualCash: '', notes: '' });
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Failed to create reconciliation')),
  });

  return (
    <FinanceLayout title="Reconciliations">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-400">Review and approve reconciliations from CAF, EMR, and Lab systems</p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />New Reconciliation
        </Button>
      </div>

      {isLoading ? <Loading variant="centered" text="Loading..." /> : error ? <Error message="Failed to load" onRetry={refetch} /> : (
        <div className="rounded-2xl border border-white/10 bg-primary-dark/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-gray-400 px-4 py-3 font-medium">Source</th>
                  <th className="text-left text-gray-400 px-4 py-3 font-medium">Period</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Sales</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Expenses</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Expected</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Actual</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Variance</th>
                  <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
                  <th className="text-left text-gray-400 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(recons || []).length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No reconciliations found</td></tr>
                ) : (
                  (recons || []).map((r) => (
                    <tr key={r._id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setSelected(r)}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sourceBadge(r.source)}`}>{r.source.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3 text-white">{r.period}</td>
                      <td className="px-4 py-3 text-right text-white">{formatMoney(r.totalSales)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatMoney(r.totalExpenses)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatMoney(r.expectedCash)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatMoney(r.actualCash)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={r.hasDiscrepancy ? 'text-red-400 font-semibold' : 'text-green-400'}>{formatMoney(r.discrepancy)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' ? (
                          <Button size="sm" onClick={(e: any) => { e?.stopPropagation(); setReviewModal(r); }}>Review</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Reconciliation Detail" size="lg">
        {selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><span className="text-gray-400 text-sm">Source</span><p className="text-white font-medium">{selected.source.toUpperCase()}</p></div>
              <div><span className="text-gray-400 text-sm">Period</span><p className="text-white font-medium">{selected.period}</p></div>
              <div><span className="text-gray-400 text-sm">Total Sales</span><p className="text-white font-medium">{formatMoney(selected.totalSales)}</p></div>
              <div><span className="text-gray-400 text-sm">Total Expenses</span><p className="text-white font-medium">{formatMoney(selected.totalExpenses)}</p></div>
              <div><span className="text-gray-400 text-sm">Expected Cash</span><p className="text-white font-medium">{formatMoney(selected.expectedCash)}</p></div>
              <div><span className="text-gray-400 text-sm">Actual Cash</span><p className="text-white font-medium">{formatMoney(selected.actualCash)}</p></div>
              <div><span className="text-gray-400 text-sm">Discrepancy</span><p className={`font-semibold ${selected.hasDiscrepancy ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(selected.discrepancy)}</p></div>
              <div><span className="text-gray-400 text-sm">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge(selected.status)}`}>{selected.status}</span></p></div>
            </div>
            {selected.items.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Line Items</h4>
                <div className="space-y-1">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between bg-white/5 rounded-lg p-2">
                      <span className="text-white text-sm">{item.description}</span>
                      <span className="text-white text-sm">{formatMoney(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {selected.reviewedBy ? (
              <div><span className="text-gray-400 text-sm">Reviewed by</span><p className="text-white">{selected.reviewedBy.firstName} {selected.reviewedBy.lastName}</p></div>
            ) : null}
            {selected.reviewNotes ? (
              <div><span className="text-gray-400 text-sm">Review Notes</span><p className="text-white">{selected.reviewNotes}</p></div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Reconciliation">
        {reviewModal ? (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium">{reviewModal.source.toUpperCase()} — {reviewModal.period}</p>
              <p className="text-sm text-gray-400">Expected: {formatMoney(reviewModal.expectedCash)} | Actual: {formatMoney(reviewModal.actualCash)}</p>
              <p className={`text-sm font-semibold ${reviewModal.hasDiscrepancy ? 'text-red-400' : 'text-green-400'}`}>
                Discrepancy: {formatMoney(reviewModal.discrepancy)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Review Notes</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 focus:border-accent-green/50 focus:outline-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="danger" onClick={() => reviewMutation.mutate({ id: reviewModal._id, status: 'rejected', notes: reviewNotes })}>
                <XCircle className="w-4 h-4 mr-2" />Reject
              </Button>
              <Button variant="primary" onClick={() => reviewMutation.mutate({ id: reviewModal._id, status: 'approved', notes: reviewNotes })}>
                <CheckCircle className="w-4 h-4 mr-2" />Approve
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Reconciliation">
        <div className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
            Expected cash (sales − expenses) will be calculated automatically from the {createForm.source.toUpperCase()} data for the chosen period.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Source</label>
              <select value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value as 'caf' | 'emr' | 'lab' })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10">
                <option value="caf">CAF</option>
                <option value="emr">EMR</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Period (YYYY-MM)</label>
              <input value={createForm.period} onChange={(e) => setCreateForm({ ...createForm, period: e.target.value })} placeholder="2026-06"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Actual Cash Counted</label>
            <input type="number" step="0.01" value={createForm.actualCash} onChange={(e) => setCreateForm({ ...createForm, actualCash: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes (optional)</label>
            <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} isLoading={createMutation.isPending}
              disabled={!createForm.period || !createForm.actualCash}>
              <Plus className="w-4 h-4 mr-2" />Create
            </Button>
          </div>
        </div>
      </Modal>
    </FinanceLayout>
  );
}
