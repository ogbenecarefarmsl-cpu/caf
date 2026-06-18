/**
 * Currency Hook for Sierra Leone Localization
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * Property 4: Formatting consistency across contexts
 * 
 * This hook provides consistent currency formatting across all React components.
 * It wraps the currency utility to provide a React-friendly interface.
 */

import { useMemo } from 'react';
import { formatCurrency, formatCurrencyWithoutSymbol, getCurrencyMeta, parseCurrency } from '../lib/currency';
import { useBranchStore } from '../stores/branch-store';

/**
 * Hook for consistent currency formatting throughout the application
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * 
 * @returns Object containing currency formatting functions and constants
 * @example
 * const { format, symbol, code } = useCurrency();
 * const displayPrice = format(1234.56); // "Le 1,234.56"
 */
export const useCurrency = () => {
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branchCurrencyCode = selectedBranch?.currencyCode;

  // Memoize the currency object to prevent unnecessary re-renders
  const meta = getCurrencyMeta(branchCurrencyCode);
  const currency = useMemo(() => ({
    /**
     * Format a monetary amount with SLE currency symbol
     * Property 1: Currency symbol prefix
     * Property 2: Two decimal places
     * Property 3: Thousand separators
     */
    format: (amount: number): string => formatCurrency(amount, meta.code),
    
    /**
     * Format a monetary amount without the currency symbol
     */
    formatWithoutSymbol: (amount: number): string => formatCurrencyWithoutSymbol(amount, meta.code),
    
    /**
     * Format a monetary amount in compact form
     */
    formatCompact: (amount: number): string => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return `${meta.symbol} 0.00`;
      }

      if (Math.abs(amount) < 1000000) {
        return formatCurrency(amount, meta.code);
      }

      const absAmount = Math.abs(amount);
      const sign = amount < 0 ? '-' : '';
      if (absAmount >= 1000000000) {
        return `${sign}${meta.symbol} ${(absAmount / 1000000000).toFixed(2)}B`;
      }
      return `${sign}${meta.symbol} ${(absAmount / 1000000).toFixed(2)}M`;
    },
    
    /**
     * Parse a formatted currency string back to a number
     */
    parse: (formattedAmount: string): number => parseCurrency(formattedAmount, meta.code),
    
    /**
     * Currency symbol (Le)
     */
    symbol: meta.symbol,
    
    /**
     * Currency code (SLE)
     */
    code: meta.code,
    
    /**
     * Number of decimal places (2)
     */
    decimalPlaces: meta.decimalPlaces,
  }), [meta.code, meta.decimalPlaces, meta.symbol]);

  return currency;
};
