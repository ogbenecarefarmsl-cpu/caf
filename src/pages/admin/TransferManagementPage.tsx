import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Batch {
  _id: string;
  productId: string;
  lotNumber: string;
  expiryDate: string;
  quantityAvailable: number;
}

interface Transfer {
  _id: string;
  sourceBranchId: {
    _id: string;
    name: string;
  };
  destinationBranchId: {
    _id: string;
    name: string;
  };
  productId: {
    name: string;
    sku: string;
  };
  batchId: {
    lotNumber: string;
  };
  quantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

interface TransferFormData {
  destinationBranchId: string;
  productId: string;
  batchId: string;
  quantity: number;
  reason: string;
}

export default function TransferManagementPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { selectedBranch } = useBranchStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransferFormData>();

  // Fetch all branches
  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      return response.data as Branch[];
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const response = await apiClient.get('/products');
      return response.data.data as Product[];
    },
  });

  // Fetch batches for selected product and branch
  const watchedProductId = watch('productId');
  const { data: batches } = useQuery({
    queryKey: queryKeys.batches.list({
      branchId: getBranchId(selectedBranch),
      productId: watchedProductId,
    }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const url = buildApiUrl('/batches', {
        branchId,
        productId: watchedProductId,
      });
      const response = await apiClient.get(url);
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Batch[];
    },
    enabled: !!selectedBranch && !!watchedProductId,
  });

  // Fetch transfers
  const { data: transfers, isLoading: transfersLoading, error: transfersError } = useQuery({
    queryKey: queryKeys.transfers.list({ branchId: getBranchId(selectedBranch) }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const response = await apiClient.get(buildApiUrl('/transfers', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Transfer[];
    },
    enabled: !!selectedBranch,
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      const branchId = getBranchId(selectedBranch);
      return apiClient.post('/transfers', {
        ...data,
        sourceBranchId: branchId,
        requestedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(), exact: false });
      setIsCreateModalOpen(false);
      reset();
      showSuccess('Transfer request created');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to create transfer'),
  });

  // Approve transfer mutation
  const approveTransferMutation = useMutation({
    mutationFn: async ({ transferId, notes }: { transferId: string; notes?: string }) => {
      return apiClient.patch(`/transfers/${transferId}/approve`, {
        approvedBy: user?.id,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(), exact: false });
      setIsApprovalModalOpen(false);
      setSelectedTransfer(null);
      setApprovalNotes('');
      showSuccess('Transfer approved');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to approve transfer'),
  });

  // Reject transfer mutation
  const rejectTransferMutation = useMutation({
    mutationFn: async ({ transferId, notes, rejectionReason }: { transferId: string; notes?: string; rejectionReason: string }) => {
      return apiClient.patch(`/transfers/${transferId}/reject`, {
        rejectionReason,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all(), exact: false });
      setIsApprovalModalOpen(false);
      setSelectedTransfer(null);
      setApprovalNotes('');
      setRejectionReason('');
      showSuccess('Transfer rejected');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to reject transfer'),
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    reset();
  };

  const handleOpenApprovalModal = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setIsApprovalModalOpen(true);
  };

  const handleCloseApprovalModal = () => {
    setIsApprovalModalOpen(false);
    setSelectedTransfer(null);
    setApprovalNotes('');
    setRejectionReason('');
  };

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate({
      ...data,
      quantity: Number(data.quantity),
    });
  };

  const handleApprove = () => {
    if (selectedTransfer) {
      approveTransferMutation.mutate({
        transferId: selectedTransfer._id,
        notes: approvalNotes,
      });
    }
  };

  const handleReject = () => {
    if (selectedTransfer) {
      if (!rejectionReason.trim()) {
        return;
      }
      rejectTransferMutation.mutate({
        transferId: selectedTransfer._id,
        rejectionReason: rejectionReason.trim(),
        notes: approvalNotes,
      });
    }
  };

  if (!selectedBranch) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Please select a branch to manage transfers</p>
        </div>
      </AdminLayout>
    );
  }

  if (transfersLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (transfersError) return <AdminLayout><Error message="Failed to load transfers" /></AdminLayout>;

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const transferColumns = [
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (transfer: Transfer) => new Date(transfer.createdAt).toLocaleDateString()
    },
    { key: 'sourceBranchId.name', header: 'From' },
    { key: 'destinationBranchId.name', header: 'To' },
    { key: 'productId.name', header: 'Product' },
    { key: 'batchId.lotNumber', header: 'Lot Number' },
    { key: 'quantity', header: 'Quantity' },
    { 
      key: 'status', 
      header: 'Status',
      render: (transfer: Transfer) => getStatusBadge(transfer.status)
    },
    { 
      key: 'requestedBy', 
      header: 'Requested By',
      render: (transfer: Transfer) => `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (transfer: Transfer) => (
        transfer.status === 'pending' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenApprovalModal(transfer)}
          >
            Review
          </Button>
        )
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Transfer Management</h1>
          <Button onClick={handleOpenCreateModal}>
            Create Transfer Request
          </Button>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transfer History</h2>
          </div>
          <Table
            data={transfers || []}
            columns={transferColumns}
          />
        </div>

        {/* Create Transfer Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          title="Create Transfer Request"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Destination Branch"
              {...register('destinationBranchId', { required: 'Destination branch is required' })}
              error={errors.destinationBranchId?.message}
            >
              <option value="" className="bg-primary-dark text-white">Select destination branch</option>
              {branches?.filter(b => b._id !== getBranchId(selectedBranch)).map(branch => (
                <option key={branch._id} value={branch._id} className="bg-primary-dark text-white">
                  {branch.name} ({branch.code})
                </option>
              ))}
            </Select>

            <Select
              label="Product"
              {...register('productId', { required: 'Product is required' })}
              error={errors.productId?.message}
              onChange={(e) => {
                setValue('productId', e.target.value);
                setValue('batchId', '');
              }}
            >
              <option value="" className="bg-primary-dark text-white">Select product</option>
              {products?.map(product => (
                <option key={product._id} value={product._id} className="bg-primary-dark text-white">
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>

            {watchedProductId && (
              <Select
                label="Batch"
                {...register('batchId', { required: 'Batch is required' })}
                error={errors.batchId?.message}
              >
                <option value="" className="bg-primary-dark text-white">Select batch</option>
                {batches?.map(batch => (
                  <option key={batch._id} value={batch._id} className="bg-primary-dark text-white">
                    Lot: {batch.lotNumber} - Available: {batch.quantityAvailable} - Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Quantity"
              type="number"
              min="1"
              {...register('quantity', { 
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' }
              })}
              error={errors.quantity?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason', { required: 'Reason is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Explain the reason for this transfer"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseCreateModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransferMutation.isPending}
              >
                {createTransferMutation.isPending ? 'Creating...' : 'Create Transfer'}
              </Button>
            </div>

            {createTransferMutation.isError && (
              <Error message="Failed to create transfer. Please try again." />
            )}
          </form>
        </Modal>

        {/* Approval Modal */}
        <Modal
          isOpen={isApprovalModalOpen}
          onClose={handleCloseApprovalModal}
          title="Review Transfer Request"
        >
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <p className="text-sm"><span className="font-semibold">From:</span> {selectedTransfer.sourceBranchId.name}</p>
                <p className="text-sm"><span className="font-semibold">To:</span> {selectedTransfer.destinationBranchId.name}</p>
                <p className="text-sm"><span className="font-semibold">Product:</span> {selectedTransfer.productId.name}</p>
                <p className="text-sm"><span className="font-semibold">Lot Number:</span> {selectedTransfer.batchId.lotNumber}</p>
                <p className="text-sm"><span className="font-semibold">Quantity:</span> {selectedTransfer.quantity}</p>
                <p className="text-sm"><span className="font-semibold">Reason:</span> {selectedTransfer.reason}</p>
                <p className="text-sm"><span className="font-semibold">Requested By:</span> {selectedTransfer.requestedBy.firstName} {selectedTransfer.requestedBy.lastName}</p>
                <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(selectedTransfer.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Provide reason for rejecting this transfer"
                />
                {rejectTransferMutation.isError && !rejectionReason.trim() ? (
                  <p className="mt-1 text-xs text-red-600">Rejection reason is required.</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this decision"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseApprovalModal}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReject}
                  disabled={rejectTransferMutation.isPending || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {rejectTransferMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveTransferMutation.isPending}
                >
                  {approveTransferMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </div>

              {(approveTransferMutation.isError || rejectTransferMutation.isError) && (
                <Error message="Failed to process transfer. Please try again." />
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}


