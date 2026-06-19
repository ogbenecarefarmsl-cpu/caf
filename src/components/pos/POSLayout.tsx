import { type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { POSSidebar } from './POSSidebar';
import { useBranchStore } from '../../stores/branch-store';
import apiClient from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { PWAUpdatePrompt } from '../ui/PWAUpdatePrompt';

interface POSLayoutProps {
  children: ReactNode;
}

export const POSLayout = ({ children }: POSLayoutProps) => {
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);

  // Re-fetch branch from API to ensure currencyCode is up-to-date
  // (handles stale localStorage from before currencyCode was added)
  const { data: freshBranch } = useQuery({
    queryKey: queryKeys.branches.detail(selectedBranch?._id ?? ''),
    queryFn: async () => {
      if (!selectedBranch?._id) return null;
      const response = await apiClient.get(`/branches/${selectedBranch._id}`);
      return response.data?.data ?? response.data;
    },
    enabled: !!selectedBranch?._id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (freshBranch?.currencyCode && freshBranch.currencyCode !== selectedBranch?.currencyCode) {
      setSelectedBranch({ ...selectedBranch, ...freshBranch });
    }
  }, [freshBranch, selectedBranch, setSelectedBranch]);

  if (!selectedBranch) {
    return (
      <div className="min-h-dvh bg-primary-darker flex items-center justify-center pt-safe-top">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">No Branch Selected</h2>
          <p className="text-gray-400">Please select a branch to use the POS terminal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-primary-darker">
      <PWAUpdatePrompt />
      <POSSidebar />
      <main className="h-dvh overflow-auto lg:ml-64 pt-safe-top">
        {children}
      </main>
    </div>
  );
};
