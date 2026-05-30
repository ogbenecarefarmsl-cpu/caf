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
import { useToast } from '../../hooks/useToast';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { getErrorMessage } from '../../lib/error-utils';

interface Product {
  _id: string;
  name: string;
  sku: string;
  brand: string;
  unit: string;
  quantityAvailable: number;
  supplierId?: { _id: string; name: string } | string;
  supplyDate?: string;
  expiryDate?: string;
}

interface StockMovement {
  _id: string;
  branchId: string;
  productId?: { _id: string; name: string; sku: string };
  quantity: number;
  movementType: string;
  reason: string;
  userId?: { firstName?: string; lastName?: string };
  timestamp: string;
}

interface AdjustmentFormData {
  productId: string;
  quantityChange: number;
  reason: string;
  approvedBy?: string;
}

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : '-';
const formatSupplier = (supplier?: Product['supplierId']) => {
  if (!supplier) return '-';
  return typeof supplier === 'string' ? supplier : supplier.name;
};

export default function StockAdjustmentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { selectedBranch } = useBranchStore();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Pagination for products
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(20);

  // Pagination for adjustments
  const [adjPage, setAdjPage] = useState(1);
  const [adjLimit, setAdjLimit] = useState(20);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdjustmentFormData>();
  const branchId = getBranchId(selectedBranch);

  // Products with pagination
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list({ branchId, page: productPage, limit: productLimit }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/products', { branchId, page: productPage, limit: productLimit }));
      return response.data;
    },
    enabled: !!branchId,
  });

  const products = productsData?.data || [];
  const productPagination = productsData?.pagination;

  // Adjustments with client-side pagination
  const { data: allAdjustments, isLoading: adjustmentsLoading } = useQuery({
    queryKey: queryKeys.adjustments.list({ branchId, movementType: 'adjustment' }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/inventory/stock-movements', { branchId, movementType: 'adjustment' }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as StockMovement[];
    },
    enabled: !!branchId,
  });

  // Client-side paginate adjustments
  const adjustments = allAdjustments || [];
  const adjTotal = adjustments.length;
  const adjStart = (adjPage - 1) * adjLimit;
  const paginatedAdjustments = adjustments.slice(adjStart, adjStart + adjLimit);
  const adjTotalPages = Math.ceil(adjTotal / adjLimit);

  // Reset to page 1 when limit changes
  const handleProductLimitChange = (limit: number) => { setProductLimit(limit); setProductPage(1); };
  const handleAdjLimitChange = (limit: number) => { setAdjLimit(limit); setAdjPage(1); };

  const adjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) =>
      apiClient.post('/inventory/adjust', { ...data, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.adjustments.all(), exact: false });
      showSuccess('Stock adjusted successfully');
      setIsModalOpen(false);
      setSelectedProduct(null);
      reset();
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Failed to adjust stock')),
  });

  const handleOpenModal = (product: Product) => { setSelectedProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedProduct(null); reset(); };
  const onSubmit = (data: AdjustmentFormData) => {
    if (!selectedProduct) return;
    adjustmentMutation.mutate({ ...data, productId: selectedProduct._id, quantityChange: Number(data.quantityChange) });
  };

  if (!selectedBranch) {
    return <AdminLayout><div className="py-12 text-center"><p className="text-gray-400">Please select a branch to manage stock adjustments</p></div></AdminLayout>;
  }

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load products" onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.products.list({ branchId }) })} /></AdminLayout>;

  const productColumns = [
    { key: 'name', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'brand', header: 'Brand' },
    { key: 'quantityAvailable', header: 'Stock' },
    { key: 'supplierId', header: 'Supplier', render: (p: Product) => formatSupplier(p.supplierId) },
    { key: 'expiryDate', header: 'Expiry', render: (p: Product) => formatDate(p.expiryDate) },
    { key: 'actions', header: '', render: (p: Product) => <Button variant="secondary" size="sm" onClick={() => handleOpenModal(p)}>Adjust</Button> },
  ];

  const adjustmentColumns = [
    { key: 'timestamp', header: 'Date', render: (a: StockMovement) => new Date(a.timestamp).toLocaleString() },
    { key: 'productId.name', header: 'Product', render: (a: StockMovement) => a.productId?.name || '-' },
    { key: 'quantity', header: 'Qty', render: (a: StockMovement) => <span className={a.quantity > 0 ? 'text-green-400' : 'text-red-400'}>{a.quantity > 0 ? '+' : ''}{a.quantity}</span> },
    { key: 'reason', header: 'Reason' },
    { key: 'userId', header: 'By', render: (a: StockMovement) => a.userId ? `${a.userId.firstName || ''} ${a.userId.lastName || ''}`.trim() || '-' : '-' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Stock Adjustments</h1>

        <div className="rounded-xl border border-white/10 bg-white/5 shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Product Stock</h2>
          </div>
          <Table
            data={products}
            columns={productColumns}
            pagination={productPagination ? { page: productPagination.page, limit: productPagination.limit, total: productPagination.total, pages: productPagination.pages, hasNext: productPagination.hasNext, hasPrev: productPagination.hasPrev } : undefined}
            onPageChange={setProductPage}
            onLimitChange={handleProductLimitChange}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 shadow-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Adjustment History</h2>
          </div>
          {adjustmentsLoading ? (
            <div className="p-6"><Loading /></div>
          ) : (
            <Table
              data={paginatedAdjustments}
              columns={adjustmentColumns}
              pagination={{ page: adjPage, limit: adjLimit, total: adjTotal, pages: adjTotalPages, hasNext: adjPage < adjTotalPages, hasPrev: adjPage > 1 }}
              onPageChange={setAdjPage}
              onLimitChange={handleAdjLimitChange}
            />
          )}
        </div>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Adjust Product Stock">
          {selectedProduct && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-300">Product: <span className="font-semibold text-white">{selectedProduct.name}</span></p>
                <p className="text-sm text-gray-300">Current Stock: <span className="font-semibold text-white">{selectedProduct.quantityAvailable}</span></p>
                <p className="text-sm text-gray-300">Supplier: <span className="font-semibold text-white">{formatSupplier(selectedProduct.supplierId)}</span></p>
              </div>
              <Input label="Quantity Change" type="number" placeholder="+ to add, - to remove" {...register('quantityChange', { required: 'Required', validate: (v) => Number(v) !== 0 || 'Cannot be zero' })} error={errors.quantityChange?.message} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Reason <span className="text-red-500">*</span></label>
                <textarea {...register('reason', { required: 'Reason is required' })} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20 resize-none" rows={3} placeholder="Why this adjustment?" />
                {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>}
              </div>
              <Input label="Approved By (Optional)" type="text" placeholder="Supervisor name" {...register('approvedBy')} />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" disabled={adjustmentMutation.isPending}>{adjustmentMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}</Button>
              </div>
              {adjustmentMutation.isError && <Error message="Failed to adjust stock. Please try again." />}
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
