import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

interface Product {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  unit: string;
  quantityAvailable: number;
  supplierId?: {
    _id: string;
    name: string;
  } | string;
  supplyDate?: string;
  expiryDate?: string;
}

interface StockMovement {
  _id: string;
  branchId: string;
  productId?: {
    _id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  movementType: string;
  reason: string;
  userId?: {
    firstName?: string;
    lastName?: string;
  };
  timestamp: string;
}

interface AdjustmentFormData {
  productId: string;
  quantityChange: number;
  reason: string;
  approvedBy?: string;
}

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '-';

const formatSupplier = (supplier?: Product['supplierId']) => {
  if (!supplier) return '-';
  return typeof supplier === 'string' ? supplier : supplier.name;
};

export default function StockAdjustmentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { selectedBranch } = useBranchStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>();

  const branchId = getBranchId(selectedBranch);

  const { data: products, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/products', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Product[];
    },
    enabled: !!branchId,
  });

  const { data: adjustments, isLoading: adjustmentsLoading } = useQuery({
    queryKey: queryKeys.adjustments.list({
      branchId,
      movementType: 'adjustment',
    }),
    queryFn: async () => {
      const response = await apiClient.get(
        buildApiUrl('/inventory/stock-movements', {
          branchId,
          movementType: 'adjustment',
        }),
      );
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as StockMovement[];
    },
    enabled: !!branchId,
  });

  const adjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) =>
      apiClient.post('/inventory/adjust', {
        ...data,
        branchId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.all(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.adjustments.all(),
        exact: false,
      });
      setIsModalOpen(false);
      setSelectedProduct(null);
      reset();
    },
  });

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    reset();
  };

  const onSubmit = (data: AdjustmentFormData) => {
    if (!selectedProduct) return;

    adjustmentMutation.mutate({
      ...data,
      productId: selectedProduct._id,
      quantityChange: Number(data.quantityChange),
    });
  };

  if (!selectedBranch) {
    return (
      <AdminLayout>
        <div className="py-12 text-center">
          <p className="text-gray-400">
            Please select a branch to manage stock adjustments
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Error message="Failed to load products" />
      </AdminLayout>
    );
  }

  const productColumns = [
    { key: 'name', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'brand', header: 'Brand' },
    { key: 'unit', header: 'Unit' },
    { key: 'quantityAvailable', header: 'Current Stock' },
    {
      key: 'supplierId',
      header: 'Supplier',
      render: (product: Product) => formatSupplier(product.supplierId),
    },
    {
      key: 'supplyDate',
      header: 'Supply Date',
      render: (product: Product) => formatDate(product.supplyDate),
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (product: Product) => formatDate(product.expiryDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenModal(product)}
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
      render: (adj: StockMovement) => new Date(adj.timestamp).toLocaleString(),
    },
    {
      key: 'productId.name',
      header: 'Product',
      render: (adj: StockMovement) => adj.productId?.name || '-',
    },
    {
      key: 'quantity',
      header: 'Adjustment',
      render: (adj: StockMovement) => (
        <span className={adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
          {adj.quantity > 0 ? '+' : ''}
          {adj.quantity}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason' },
    {
      key: 'userId',
      header: 'Adjusted By',
      render: (adj: StockMovement) =>
        adj.userId
          ? `${adj.userId.firstName || ''} ${adj.userId.lastName || ''}`.trim()
          : '-',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            Stock Adjustments
          </h1>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              Product Stock
            </h2>
          </div>
          <Table data={products || []} columns={productColumns} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              Adjustment History
            </h2>
          </div>
          {adjustmentsLoading ? (
            <div className="p-6">
              <Loading />
            </div>
          ) : (
            <Table data={adjustments || []} columns={adjustmentColumns} />
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Adjust Product Stock"
        >
          {selectedProduct ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <p className="text-sm text-gray-300">
                  Product:{' '}
                  <span className="font-semibold text-white">{selectedProduct.name}</span>
                </p>
                <p className="text-sm text-gray-300">
                  Current Stock:{' '}
                  <span className="font-semibold text-white">
                    {selectedProduct.quantityAvailable}
                  </span>
                </p>
                <p className="text-sm text-gray-300">
                  Supplier:{' '}
                  <span className="font-semibold text-white">
                    {formatSupplier(selectedProduct.supplierId)}
                  </span>
                </p>
              </div>

              <Input
                label="Quantity Change"
                type="number"
                placeholder="Use positive to add or negative to remove"
                {...register('quantityChange', {
                  required: 'Quantity change is required',
                  validate: (value) =>
                    Number(value) !== 0 || 'Quantity change cannot be zero',
                })}
                error={errors.quantityChange?.message}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('reason', { required: 'Reason is required' })}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
                  rows={3}
                  placeholder="Explain the reason for this adjustment"
                />
                {errors.reason ? (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.reason.message}
                  </p>
                ) : null}
              </div>

              <Input
                label="Approved By (Optional)"
                type="text"
                placeholder="Enter supervisor name"
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
                <Button type="submit" disabled={adjustmentMutation.isPending}>
                  {adjustmentMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>

              {adjustmentMutation.isError ? (
                <Error message="Failed to adjust stock. Please try again." />
              ) : null}
            </form>
          ) : null}
        </Modal>
      </div>
    </AdminLayout>
  );
}
