import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import { useCurrency } from '../../hooks/useCurrency';
import { useBranchAwareCRUDMutations } from '../../hooks/useCRUDMutations';

const TX_TYPES = [
  { value: 'cash_in', label: 'Cash In' },
  { value: 'cash_out', label: 'Cash Out' },
  { value: 'expense', label: 'Expense' },
  { value: 'marketer_remittance', label: 'Marketer Remittance' },
];

const TYPE_BADGE: Record<string, string> = {
  cash_in: 'bg-green-100 text-green-800',
  cash_out: 'bg-red-100 text-red-800',
  expense: 'bg-orange-100 text-orange-800',
  marketer_remittance: 'bg-purple-100 text-purple-800',
};

const TYPE_LABEL: Record<string, string> = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
  expense: 'Expense',
  marketer_remittance: 'Marketer Remittance',
};

interface FinanceTransaction {
  _id: string;
  branchId: string;
  type: string;
  amount: number;
  category?: string;
  description?: string;
  reference?: string;
  recordedBy: { _id: string; firstName: string; lastName: string } | string;
  transactionDate: string;
  createdAt: string;
}

interface FinanceSummary {
  branchId: string;
  totalCashIn: number;
  totalCashOut: number;
  totalExpenses: number;
  totalMarketerRemittance: number;
  net: number;
}

interface TxFormData {
  type: string;
  amount: number;
  category?: string;
  description?: string;
  reference?: string;
  transactionDate: string;
}

export function FinanceTransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedBranch } = useBranchStore();
  const { format } = useCurrency();

  const branchId = getBranchId(selectedBranch);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TxFormData>({
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
    },
  });

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: queryKeys.finance.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get('/finance/transactions', {
        params: { branchId },
      });
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as FinanceTransaction[];
    },
    enabled: !!branchId,
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.finance.summary(branchId),
    queryFn: async () => {
      const response = await apiClient.get('/finance/transactions/summary', {
        params: { branchId },
      });
      return response.data as FinanceSummary;
    },
    enabled: !!branchId,
  });

  const mutationOptions = {
    resourceLabel: 'Transaction',
    onCreateSuccess: () => {
      setIsModalOpen(false);
      reset();
    },
  };

  const { createMutation } = useBranchAwareCRUDMutations(
    'finance/transactions',
    queryKeys.finance.all(),
    branchId || '',
    mutationOptions,
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Finance Transactions</h1>
          <Button onClick={() => setIsModalOpen(true)} disabled={!selectedBranch}>
            + Add Transaction
          </Button>
        </div>

        {!selectedBranch && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm mb-4">
            Select a branch to view transactions.
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cash In</p>
              <p className="text-xl font-bold text-green-600">{format(summary.totalCashIn)}</p>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cash Out</p>
              <p className="text-xl font-bold text-red-600">{format(summary.totalCashOut)}</p>
            </div>
            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Expenses</p>
              <p className="text-xl font-bold text-orange-600">{format(summary.totalExpenses)}</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Remittance</p>
              <p className="text-xl font-bold text-purple-600">{format(summary.totalMarketerRemittance)}</p>
            </div>
            <div className={`bg-white border rounded-lg p-4 ${summary.net >= 0 ? 'border-green-300' : 'border-red-300'}`}>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Net</p>
              <p className={`text-xl font-bold ${summary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{format(summary.net)}</p>
            </div>
          </div>
        )}

        {isLoading && <Loading />}
        {error && <Error message="Failed to load transactions" />}

        {transactions && transactions.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-12">
            No transactions recorded for this branch.
          </div>
        )}

        {transactions && transactions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table
              columns={[
                {
                  key: 'transactionDate',
                  header: 'Date',
                  render: (row: FinanceTransaction) => new Date(row.transactionDate).toLocaleDateString(),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (row: FinanceTransaction) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_BADGE[row.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABEL[row.type] ?? row.type}
                    </span>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (row: FinanceTransaction) => (
                    <div>
                      <p className="text-gray-900">{row.description ?? '—'}</p>
                      {row.reference && <p className="text-xs text-gray-400">Ref: {row.reference}</p>}
                      {row.category && <p className="text-xs text-gray-400">{row.category}</p>}
                    </div>
                  ),
                },
                {
                  key: 'recordedBy',
                  header: 'Recorded By',
                  render: (row: FinanceTransaction) =>
                    typeof row.recordedBy === 'object'
                      ? `${row.recordedBy.firstName} ${row.recordedBy.lastName}`
                      : '—',
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (row: FinanceTransaction) => (
                    <span className={`font-semibold ${row.type === 'cash_in' ? 'text-green-700' : 'text-red-700'}`}>
                      {row.type === 'cash_in' ? '+' : '-'}{format(row.amount)}
                    </span>
                  ),
                },
              ]}
              data={transactions}
            />
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); reset(); }}
          title="Add Finance Transaction"
        >
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                {...register('type', { required: 'Type is required' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select type…</option>
                {TX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
            </div>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: { value: 0.01, message: 'Must be > 0' } })}
              error={errors.amount?.message}
            />
            <Input label="Category (optional)" {...register('category')} />
            <Input label="Description (optional)" {...register('description')} />
            <Input label="Reference (optional)" {...register('reference')} />
            <Input
              label="Transaction Date"
              type="date"
              {...register('transactionDate', { required: 'Date is required' })}
              error={errors.transactionDate?.message}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => { setIsModalOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Record
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
