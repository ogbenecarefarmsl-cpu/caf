import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { buildApiUrl } from '../../lib/api-utils';

interface Batch {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
  };
  lotNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  sellingPrice: number;
}

interface StockMovement {
  _id: string;
  branchId: string;
  productId: {
    name: string;
    sku: string;
  };
  batchId: {
    lotNumber: string;
  };
  quantity: number;
  movementType: string;
  reason: string;
  userId: {
    firstName: string;
    lastName: string;
  };
  timestamp: string;
}

interface AdjustmentFormData {
  batchId: string;
  quantityChange: number;
  reason: string;
  approvedBy?: string;
}

export default function StockAdjustmentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const { selectedBranch } = useBranchStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdjustmentFormData>();

  // Fetch batches for the selected branch
  const { data: batches, isLoading: batchesLoading, error: batchesError } = useQuery({
    queryKey: queryKeys.batches.list({ branchId: getBranchId(selectedBranch) }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const response = await apiClient.get(buildApiUrl('/batches', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Batch[];
    },
    enabled: !!selectedBranch,
  });

  // Fetch adjustment history (stock movements of type 'adjustment')
  const { data: adjustments, isLoading: adjustmentsLoading } = useQuery({
    queryKey: queryKeys.adjustments.list({
      branchId: getBranchId(selectedBranch),
      movementType: 'adjustment',
    }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const response = await apiClient.get(buildApiUrl('/inventory/stock-movements', {
        branchId,
        movementType: 'adjustment',
      }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as StockMovement[];
    },
    enabled: !!selectedBranch,
  });

  // Create adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      const branchId = getBranchId(selectedBranch);
      return apiClient.post('/inventory/adjust', {
        ...data,
        branchId: branchId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.adjustments.all(), exact: false });
      setIsModalOpen(false);
      reset();
      setSelectedBatch(null);
    },
  });

  const handleOpenModal = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBatch(null);
    reset();
  };

  const onSubmit = (data: AdjustmentFormData) => {
    if (selectedBatch) {
      adjustmentMutation.mutate({
        ...data,
        batchId: selectedBatch._id,
        quantityChange: Number(data.quantityChange),
      });
    }
  };

  if (!selectedBranch) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Please select a branch to manage stock adjustments</p>
        </div>
      </AdminLayout>
    );
  }

  if (batchesLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (batchesError) return <AdminLayout><Error message="Failed to load batches" /></AdminLayout>;

  const batchColumns = [
    { key: 'productId.name', header: 'Product' },
    { key: 'productId.sku', header: 'SKU' },
    { key: 'lotNumber', header: 'Lot Number' },
    { 
      key: 'expiryDate', 
      header: 'Expiry Date',
      render: (batch: Batch) => new Date(batch.expiryDate).toLocaleDateString()
    },
    { key: 'quantityAvailable', header: 'Current Stock' },
    {
      key: 'actions',
      header: 'Actions',
      render: (batch: Batch) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenModal(batch)}
        >
          Adjust
        </Button>
      ),
    },
  ];

  const adjustmentColumns = [
    { 
      key: 'timestamp', 
      header: 'Date',
      render: (adj: StockMovement) => new Date(adj.timestamp).toLocaleString()
    },
    { key: 'productId.name', header: 'Product' },
    { key: 'batchId.lotNumber', header: 'Lot Number' },
    { 
      key: 'quantity', 
      header: 'Adjustment',
      render: (adj: StockMovement) => (
        <span className={adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
          {adj.quantity > 0 ? '+' : ''}{adj.quantity}
        </span>
      )
    },
    { key: 'reason', header: 'Reason' },
    { 
      key: 'userId', 
      header: 'Adjusted By',
      render: (adj: StockMovement) => `${adj.userId.firstName} ${adj.userId.lastName}`
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
        </div>

        {/* Current Stock Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Current Stock</h2>
          </div>
          <Table
            data={batches || []}
            columns={batchColumns}
          />
        </div>

        {/* Adjustment History Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Adjustment History</h2>
          </div>
          {adjustmentsLoading ? (
            <div className="p-6"><Loading /></div>
          ) : (
            <Table
              data={adjustments || []}
              columns={adjustmentColumns}
            />
          )}
        </div>

        {/* Adjustment Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Adjust Stock"
        >
          {selectedBatch && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Product: <span className="font-semibold">{selectedBatch.productId.name}</span></p>
                <p className="text-sm text-gray-600">Lot Number: <span className="font-semibold">{selectedBatch.lotNumber}</span></p>
                <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold">{selectedBatch.quantityAvailable}</span></p>
              </div>

              <Input
                label="Quantity Change"
                type="number"
                placeholder="Enter adjustment (+/-)"
                {...register('quantityChange', { 
                  required: 'Quantity change is required',
                  validate: (value) => value !== 0 || 'Quantity change cannot be zero'
                })}
                error={errors.quantityChange?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('reason', { required: 'Reason is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Explain the reason for this adjustment"
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              <Input
                label="Approved By (Optional)"
                type="text"
                placeholder="Enter supervisor name (optional)"
                {...register('approvedBy')}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={adjustmentMutation.isPending}
                >
                  {adjustmentMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>

              {adjustmentMutation.isError && (
                <Error message="Failed to adjust stock. Please try again." />
              )}
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

