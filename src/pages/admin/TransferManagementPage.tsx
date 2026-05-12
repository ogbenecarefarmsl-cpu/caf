import { useState } from 'react';
import { ArrowRightLeft, Package, Truck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Error } from '../../components/ui/Error';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../lib/api-utils';
import { queryKeys } from '../../lib/query-keys';
import { getBranchId, useBranchStore } from '../../stores/branch-store';

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
  const branchId = getBranchId(selectedBranch);
  const watchedProductId = watch('productId');

  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      return response.data as Branch[];
    },
  });

  const { data: products } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const response = await apiClient.get('/products');
      return response.data.data as Product[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: queryKeys.batches.list({
      branchId,
      productId: watchedProductId,
    }),
    queryFn: async () => {
      const url = buildApiUrl('/batches', {
        branchId,
        productId: watchedProductId,
      });
      const response = await apiClient.get(url);
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Batch[];
    },
    enabled: !!branchId && !!watchedProductId,
  });

  const { data: transfers, isLoading: transfersLoading, error: transfersError } = useQuery({
    queryKey: queryKeys.transfers.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/transfers', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Transfer[];
    },
    enabled: !!branchId,
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => apiClient.post('/transfers', {
      ...data,
      sourceBranchId: branchId,
      requestedBy: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(), exact: false });
      setIsCreateModalOpen(false);
      reset();
      showSuccess('Transfer request created');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to create transfer'),
  });

  const approveTransferMutation = useMutation({
    mutationFn: async ({ transferId, notes }: { transferId: string; notes?: string }) =>
      apiClient.patch(`/transfers/${transferId}/approve`, {
        approvedBy: user?.id,
        notes,
      }),
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

  const rejectTransferMutation = useMutation({
    mutationFn: async ({ transferId, notes, rejectionReason: reason }: { transferId: string; notes?: string; rejectionReason: string }) =>
      apiClient.patch(`/transfers/${transferId}/reject`, {
        rejectionReason: reason,
        notes,
      }),
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

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate({
      ...data,
      quantity: Number(data.quantity),
    });
  };

  const getStatusBadge = (status: Transfer['status']) => {
    const colors = {
      pending: 'border border-yellow-500/20 bg-yellow-500/15 text-yellow-300',
      approved: 'border border-blue-500/20 bg-blue-500/15 text-blue-300',
      completed: 'border border-accent-green/20 bg-accent-green/15 text-accent-green',
      rejected: 'border border-red-500/20 bg-red-500/15 text-red-300',
    };

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const transferColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (transfer: Transfer) => <span className="text-gray-300">{new Date(transfer.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'sourceBranchId.name',
      header: 'From',
      render: (transfer: Transfer) => <span className="text-white">{transfer.sourceBranchId.name}</span>,
    },
    {
      key: 'destinationBranchId.name',
      header: 'To',
      render: (transfer: Transfer) => <span className="text-white">{transfer.destinationBranchId.name}</span>,
    },
    {
      key: 'productId.name',
      header: 'Product',
      render: (transfer: Transfer) => (
        <div className="min-w-0">
          <p className="text-white">{transfer.productId.name}</p>
          <p className="text-xs text-gray-500">{transfer.productId.sku}</p>
        </div>
      ),
      className: 'whitespace-normal',
    },
    {
      key: 'batchId.lotNumber',
      header: 'Lot Number',
      render: (transfer: Transfer) => <span className="text-gray-300">{transfer.batchId.lotNumber}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (transfer: Transfer) => <span className="text-white">{transfer.quantity}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (transfer: Transfer) => getStatusBadge(transfer.status),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (transfer: Transfer) => (
        <span className="text-gray-300">{transfer.requestedBy.firstName} {transfer.requestedBy.lastName}</span>
      ),
      className: 'whitespace-normal',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (transfer: Transfer) => (
        transfer.status === 'pending' ? (
          <Button variant="secondary" size="sm" onClick={() => {
            setSelectedTransfer(transfer);
            setIsApprovalModalOpen(true);
          }}>
            Review
          </Button>
        ) : null
      ),
    },
  ];

  if (!selectedBranch) {
    return (
      <AdminLayout title="Transfer Management">
        <div className="rounded-xl border border-white/10 bg-primary-dark py-12 text-center text-gray-400">
          Please select a branch to manage transfers.
        </div>
      </AdminLayout>
    );
  }

  if (transfersLoading) {
    return <AdminLayout title="Transfer Management"><Loading /></AdminLayout>;
  }

  if (transfersError) {
    return <AdminLayout title="Transfer Management"><Error message="Failed to load transfers" /></AdminLayout>;
  }

  const safeTransfers = transfers || [];

  return (
    <AdminLayout title="Transfer Management">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-7 w-7 text-accent-green" />
              <h1 className="text-2xl font-bold text-white">Transfer Management</h1>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Create branch-to-branch requests, review pending movements, and keep stock transfers easy to read on mobile and desktop.
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
            Create Transfer Request
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-primary-dark p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-accent-green" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Total transfers</p>
                <p className="text-2xl font-semibold text-white">{safeTransfers.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-primary-dark p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-300">
              {safeTransfers.filter((transfer) => transfer.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-primary-dark p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-accent-green">
              {safeTransfers.filter((transfer) => transfer.status === 'completed').length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-primary-dark p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-300" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Active branch</p>
                <p className="text-sm font-semibold text-white">{selectedBranch.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-primary-dark shadow-sm">
          <div className="border-b border-white/10 px-4 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Transfer History</h2>
            <p className="mt-1 text-sm text-gray-400">
              Review all outgoing and incoming requests for the selected branch.
            </p>
          </div>

          <div className="hidden md:block">
            <Table data={safeTransfers} columns={transferColumns} />
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {safeTransfers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-primary-darker p-6 text-center text-sm text-gray-400">
                No transfers found for this branch.
              </div>
            ) : (
              safeTransfers.map((transfer) => (
                <div key={transfer._id} className="rounded-xl border border-white/10 bg-primary-darker p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{transfer.productId.name}</p>
                      <p className="text-xs text-gray-500">{transfer.productId.sku}</p>
                    </div>
                    {getStatusBadge(transfer.status)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">From</p>
                      <p className="text-white">{transfer.sourceBranchId.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">To</p>
                      <p className="text-white">{transfer.destinationBranchId.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lot</p>
                      <p className="text-white">{transfer.batchId.lotNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Qty</p>
                      <p className="text-white">{transfer.quantity}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="text-gray-500">Requested by</p>
                    <p className="text-white">{transfer.requestedBy.firstName} {transfer.requestedBy.lastName}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(transfer.createdAt).toLocaleString()}</p>
                  </div>
                  {transfer.status === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setIsApprovalModalOpen(true);
                      }}
                    >
                      Review
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            reset();
          }}
          title="Create Transfer Request"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              label="Destination Branch"
              {...register('destinationBranchId', { required: 'Destination branch is required' })}
              error={errors.destinationBranchId?.message}
            >
              <option value="" className="bg-primary-dark text-white">Select destination branch</option>
              {branches?.filter((branch) => branch._id !== branchId).map((branch) => (
                <option key={branch._id} value={branch._id} className="bg-primary-dark text-white">
                  {branch.name} ({branch.code})
                </option>
              ))}
            </Select>

            <Select
              label="Product"
              {...register('productId', { required: 'Product is required' })}
              error={errors.productId?.message}
              onChange={(event) => {
                setValue('productId', event.target.value);
                setValue('batchId', '');
              }}
            >
              <option value="" className="bg-primary-dark text-white">Select product</option>
              {products?.map((product) => (
                <option key={product._id} value={product._id} className="bg-primary-dark text-white">
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>

            {watchedProductId ? (
              <Select
                label="Batch"
                {...register('batchId', { required: 'Batch is required' })}
                error={errors.batchId?.message}
              >
                <option value="" className="bg-primary-dark text-white">Select batch</option>
                {batches?.map((batch) => (
                  <option key={batch._id} value={batch._id} className="bg-primary-dark text-white">
                    Lot: {batch.lotNumber} • Available: {batch.quantityAvailable} • Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            ) : null}

            <Input
              label="Quantity"
              type="number"
              min="1"
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' },
              })}
              error={errors.quantity?.message}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason', { required: 'Reason is required' })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-all duration-200 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
                rows={3}
                placeholder="Explain the reason for this transfer"
              />
              {errors.reason ? (
                <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => {
                setIsCreateModalOpen(false);
                reset();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransferMutation.isPending}>
                {createTransferMutation.isPending ? 'Creating...' : 'Create Transfer'}
              </Button>
            </div>

            {createTransferMutation.isError ? (
              <Error message="Failed to create transfer. Please try again." />
            ) : null}
          </form>
        </Modal>

        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedTransfer(null);
            setApprovalNotes('');
            setRejectionReason('');
          }}
          title="Review Transfer Request"
        >
          {selectedTransfer ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl border border-white/10 bg-primary-darker p-4 text-sm text-gray-300">
                <p><span className="font-semibold text-white">From:</span> {selectedTransfer.sourceBranchId.name}</p>
                <p><span className="font-semibold text-white">To:</span> {selectedTransfer.destinationBranchId.name}</p>
                <p><span className="font-semibold text-white">Product:</span> {selectedTransfer.productId.name}</p>
                <p><span className="font-semibold text-white">Lot Number:</span> {selectedTransfer.batchId.lotNumber}</p>
                <p><span className="font-semibold text-white">Quantity:</span> {selectedTransfer.quantity}</p>
                <p><span className="font-semibold text-white">Reason:</span> {selectedTransfer.reason}</p>
                <p><span className="font-semibold text-white">Requested By:</span> {selectedTransfer.requestedBy.firstName} {selectedTransfer.requestedBy.lastName}</p>
                <p><span className="font-semibold text-white">Date:</span> {new Date(selectedTransfer.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-all duration-200 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
                  rows={2}
                  placeholder="Provide reason for rejecting this transfer"
                />
                {rejectTransferMutation.isError && !rejectionReason.trim() ? (
                  <p className="mt-1 text-xs text-red-500">Rejection reason is required.</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-all duration-200 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
                  rows={3}
                  placeholder="Add any notes about this decision"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsApprovalModalOpen(false);
                    setSelectedTransfer(null);
                    setApprovalNotes('');
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (!selectedTransfer || !rejectionReason.trim()) {
                      return;
                    }
                    rejectTransferMutation.mutate({
                      transferId: selectedTransfer._id,
                      rejectionReason: rejectionReason.trim(),
                      notes: approvalNotes,
                    });
                  }}
                  disabled={rejectTransferMutation.isPending || !rejectionReason.trim()}
                >
                  {rejectTransferMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedTransfer) {
                      return;
                    }
                    approveTransferMutation.mutate({
                      transferId: selectedTransfer._id,
                      notes: approvalNotes,
                    });
                  }}
                  disabled={approveTransferMutation.isPending}
                >
                  {approveTransferMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </div>

              {approveTransferMutation.isError || rejectTransferMutation.isError ? (
                <Error message="Failed to process transfer. Please try again." />
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </AdminLayout>
  );
}
