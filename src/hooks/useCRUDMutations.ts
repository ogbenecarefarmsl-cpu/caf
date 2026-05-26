import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import { useToast } from './useToast';
import { getErrorMessage } from '../lib/error-utils';

const unwrapResponseData = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

/**
 * Generic CRUD mutation hook factory
 * 
 * Provides standardized create, update, and delete mutations with:
 * - Automatic cache invalidation
 * - Toast notifications
 * - Error handling
 * - Type safety
 * 
 * @param resource - API resource name (e.g., 'products', 'users')
 * @param queryKey - Query key to invalidate after mutations
 * @param options - Optional configuration
 * 
 * @example
 * const { createMutation, updateMutation, deleteMutation } = useCRUDMutations<Product>(
 *   'products',
 *   queryKeys.products.lists()
 * );
 * 
 * // Create
 * createMutation.mutate(newProduct);
 * 
 * // Update
 * updateMutation.mutate({ id: '123', data: updatedProduct });
 * 
 * // Delete
 * deleteMutation.mutate('123');
 */
export const useCRUDMutations = <T extends { _id?: string; id?: string }>(
  resource: string,
  queryKey: readonly unknown[],
  options?: {
    resourceLabel?: string;
    onCreateSuccess?: (data: T) => void;
    onUpdateSuccess?: (data: T) => void;
    onDeleteSuccess?: () => void;
  }
) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const resourceLabel = options?.resourceLabel || resource;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<T, '_id' | 'id'>) => {
      const response = await apiClient.post(`/${resource}`, data);
      return unwrapResponseData<T>(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} created successfully`);
      options?.onCreateSuccess?.(data);
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to create ${resourceLabel}`));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const response = await apiClient.patch(`/${resource}/${id}`, data);
      return unwrapResponseData<T>(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} updated successfully`);
      options?.onUpdateSuccess?.(data);
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to update ${resourceLabel}`));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/${resource}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} deleted successfully`);
      options?.onDeleteSuccess?.();
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to delete ${resourceLabel}`));
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};

/**
 * Specialized mutation hook for resources that require branch context
 * 
 * @example
 * const { createMutation } = useBranchAwareCRUDMutations<Product>(
 *   'products',
 *   queryKeys.products.lists(),
 *   branchId
 * );
 */
export const useBranchAwareCRUDMutations = <T extends { _id?: string; id?: string }>(
  resource: string,
  queryKey: readonly unknown[],
  branchId: string,
  options?: {
    resourceLabel?: string;
    onCreateSuccess?: (data: T) => void;
    onUpdateSuccess?: (data: T) => void;
    onDeleteSuccess?: () => void;
  }
) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const resourceLabel = options?.resourceLabel || resource;

  // Create mutation with branchId
  const createMutation = useMutation({
    mutationFn: async (data: Omit<T, '_id' | 'id'>) => {
      const payload = { ...data, branchId };
      const response = await apiClient.post(`/${resource}`, payload);
      return unwrapResponseData<T>(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} created successfully`);
      options?.onCreateSuccess?.(data);
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to create ${resourceLabel}`));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const response = await apiClient.patch(`/${resource}/${id}`, data);
      return unwrapResponseData<T>(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} updated successfully`);
      options?.onUpdateSuccess?.(data);
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to update ${resourceLabel}`));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/${resource}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey, exact: false });
      showSuccess(`${resourceLabel} deleted successfully`);
      options?.onDeleteSuccess?.();
    },
    onError: (error) => {
      showError(getErrorMessage(error, `Failed to delete ${resourceLabel}`));
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
