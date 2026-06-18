import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: 'SLE' | 'USD';
  isHeadquarters: boolean;
}

// Helper to normalize branch data from API (handles both _id and id)
export const normalizeBranch = (branch: Partial<Branch & { id?: string }>): Branch => ({
  _id: branch._id || branch.id || '',
  name: branch.name || '',
  code: branch.code || '',
  address: branch.address || '',
  phone: branch.phone || '',
  email: branch.email || '',
  currencyCode: branch.currencyCode === 'USD' ? 'USD' : 'SLE',
  isHeadquarters: branch.isHeadquarters || false,
});

// Helper to get branch ID consistently
export const getBranchId = (branch: Branch | null): string | undefined => {
  return branch?._id;
};

interface BranchState {
  selectedBranch: Branch | null;
  branches: Branch[];
  
  // Actions
  setSelectedBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[] | Partial<Branch & { id?: string }>[]) => void;
  clearBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      branches: [],

      setSelectedBranch: (branch) => {
        set({ selectedBranch: branch ? normalizeBranch(branch) : null });
      },

      setBranches: (branches) => {
        set({ branches: branches.map(normalizeBranch) });
      },

      clearBranch: () => {
        set({ selectedBranch: null });
      },
    }),
    {
      name: 'branch-storage',
    }
  )
);
