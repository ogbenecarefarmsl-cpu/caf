import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import { useBranchStore } from '../../stores/branch-store';
import { useCurrency } from '../../hooks/useCurrency';

interface MarketerUser {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: string;
  branchId?: string;
}

interface Product {
  id?: string;
  _id?: string;
  name: string;
  sku: string;
  branchId?: string;
  quantityAvailable?: number;
  stock?: number;
}

interface Assignment {
  _id: string;
  branchId?: { _id?: string; name?: string };
  marketerId?: { _id?: string; firstName?: string; lastName?: string; username?: string };
  productId?: { _id?: string; name?: string; sku?: string };
  assignedQuantity: number;
  remainingQuantity: number;
  assignedUnitPrice: number;
  status: 'pending' | 'accepted' | 'rejected';
  isActive: boolean;
  createdAt: string;
}

interface AssignmentResponse {
  data: Assignment[];
  count: number;
}

const asArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
};

const asAssignmentResponse = (payload: unknown): AssignmentResponse => {
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    const data = (payload as { data: Assignment[]; count?: number; total?: number }).data;
    return {
      data,
      count: (payload as { count?: number; total?: number }).count ?? (payload as { total?: number }).total ?? data.length,
    };
  }

  const data = asArray<Assignment>(payload);
  return { data, count: data.length };
};

export const MarketerAssignmentsPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const selectedBranch = useBranchStore((s) => s.selectedBranch);
  const { format } = useCurrency();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marketerId, setMarketerId] = useState('');
  const [productId, setProductId] = useState('');
  const [assignedQuantity, setAssignedQuantity] = useState('');
  const [assignedUnitPrice, setAssignedUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  const branchId = selectedBranch?._id || user?.branchId || '';

  const { data: assignmentsData, isLoading } = useQuery<AssignmentResponse>({
    queryKey: queryKeys.marketer.assignments({ branchId, activeOnly: true }),
    queryFn: async () => {
      const params: Record<string, string | boolean> = { activeOnly: true };
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get('/marketer/assignments', { params });
      return asAssignmentResponse(response.data);
    },
    enabled: !!branchId,
  });

  const { data: users } = useQuery<MarketerUser[]>({
    queryKey: queryKeys.users.list({ role: 'marketer' }),
    queryFn: async () => {
      const response = await apiClient.get('/users', { params: { role: 'marketer' } });
      return asArray<MarketerUser>(response.data);
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: queryKeys.products.list({ branchId }),
    queryFn: async () => {
      // Load ALL products (not filtered by branch) so marketers can be assigned any product
      const response = await apiClient.get('/products', { params: { limit: 500 } });
      return asArray<Product>(response.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/marketer/assignments', {
        branchId,
        marketerId,
        productId,
        assignedQuantity: Number(assignedQuantity),
        assignedUnitPrice: Number(assignedUnitPrice),
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketer.all(), exact: false });
      setIsModalOpen(false);
      setMarketerId('');
      setProductId('');
      setAssignedQuantity('');
      setAssignedUnitPrice('');
      setNotes('');
    },
  });

  const columns = [
    {
      key: 'marketer',
      header: 'Marketer',
      render: (item: Assignment) => (
        <span>{item.marketerId?.firstName || ''} {item.marketerId?.lastName || item.marketerId?.username || '-'}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (item: Assignment) => (
        <span>{item.productId?.name || '-'} ({item.productId?.sku || '-'})</span>
      ),
    },
    {
      key: 'qty',
      header: 'Assigned / Remaining',
      render: (item: Assignment) => (
        <span>{item.assignedQuantity} / {item.remainingQuantity}</span>
      ),
    },
    {
      key: 'price',
      header: 'Unit Price',
      render: (item: Assignment) => <span>{format(item.assignedUnitPrice)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Assignment) => (
        <span
          className={
            item.status === 'accepted'
              ? 'text-green-400'
              : item.status === 'pending'
                ? 'text-yellow-400'
                : 'text-red-400'
          }
        >
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout title="Marketer Product Assignments">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketer Assignments</h1>
            <p className="text-gray-400 mt-1">Assign products and selling prices to marketers.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} disabled={!branchId}>New Assignment</Button>
        </div>

        <Table
          data={assignmentsData?.data || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No assignments yet"
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Product" size="md">
        <div className="space-y-4">
          <Select
            label="Marketer"
            value={marketerId}
            onChange={(e) => setMarketerId(e.target.value)}
            options={[
              { value: '', label: 'Select marketer' },
              ...(users || []).map((u) => ({
                value: u.id || u._id || '',
                label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unknown',
              })),
            ]}
          />

          <Select
            label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: '', label: 'Select product' },
              ...(products || []).map((p) => ({
                value: p.id || p._id || '',
                label: `${p.name} (${p.sku}) — Stock: ${p.quantityAvailable ?? p.stock ?? 'N/A'}`,
              })),
            ]}
          />

          <Input
            label="Assigned Quantity"
            type="number"
            value={assignedQuantity}
            onChange={(e) => setAssignedQuantity(e.target.value)}
            min={1}
          />

          <Input
            label="Assigned Unit Price"
            type="number"
            value={assignedUnitPrice}
            onChange={(e) => setAssignedUnitPrice(e.target.value)}
            min={0}
            step="0.01"
          />

          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              isLoading={createMutation.isPending}
              disabled={!marketerId || !productId || !assignedQuantity || !assignedUnitPrice}
            >
              Assign Product
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
