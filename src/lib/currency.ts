/**
 * Currency Utility for Sierra Leone Localization
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * Properties: 1, 2, 3, 4
 * 
 * This utility provides consistent currency formatting across the frontend application.
 * It matches the backend implementation to ensure consistency.
 */

export type CurrencyCode = 'SLE' | 'USD';

const CURRENCY_META: Record<CurrencyCode, { symbol: string; decimalPlaces: number }> = {
  SLE: { symbol: 'Le', decimalPlaces: 2 },
  USD: { symbol: '$', decimalPlaces: 2 },
};

export const getCurrencyMeta = (code: string | undefined): { code: CurrencyCode; symbol: string; decimalPlaces: number } => {
  const currencyCode = code === 'USD' ? 'USD' : 'SLE';
  return {
    code: currencyCode,
    ...CURRENCY_META[currencyCode],
  };
};

export const formatCurrency = (amount: number, code?: string): string => {
  const currency = getCurrencyMeta(code);

  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency.symbol} 0.00`;
  }

  const fixedAmount = amount.toFixed(currency.decimalPlaces);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${currency.symbol} ${formattedInteger}.${decimalPart}`;
};

export const formatCurrencyCompact = (amount: number, code?: string): string => {
  const currency = getCurrencyMeta(code);

  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency.symbol} 0.00`;
  }

  if (Math.abs(amount) < 1000000) {
    return formatCurrency(amount, code);
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absAmount >= 1000000000) {
    return `${sign}${currency.symbol} ${(absAmount / 1000000000).toFixed(2)}B`;
  }
  return `${sign}${currency.symbol} ${(absAmount / 1000000).toFixed(2)}M`;
};

export const formatCurrencyWithoutSymbol = (amount: number, code?: string): string => {
  const currency = getCurrencyMeta(code);

  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }

  const fixedAmount = amount.toFixed(currency.decimalPlaces);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${formattedInteger}.${decimalPart}`;
};

export const parseCurrency = (formattedAmount: string, code?: string): number => {
  if (!formattedAmount || typeof formattedAmount !== 'string') {
    return 0;
  }

  const currency = getCurrencyMeta(code);
  const cleanedAmount = formattedAmount
    .replace(currency.symbol, '')
    .replace('Le', '')
    .replace('$', '')
    .replace(/\s/g, '')
    .replace(/,/g, '');

  const parsed = parseFloat(cleanedAmount);

  return isNaN(parsed) ? 0 : parsed;
};

export const CURRENCY = {
  code: 'SLE' as CurrencyCode,
  symbol: CURRENCY_META.SLE.symbol,
  decimalPlaces: CURRENCY_META.SLE.decimalPlaces,

  /**
   * Format a monetary amount with SLE currency symbol and proper formatting
   * Property 1: Currency symbol prefix
   * Property 2: Two decimal places
   * Property 3: Thousand separators
   * Requirements: 1.1, 1.2, 1.3
   * 
   * @param amount - The numeric amount to format
   * @returns Formatted string with "Le" prefix, two decimal places, and comma separators
   * @example
   * CURRENCY.format(1234.56) // "Le 1,234.56"
   * CURRENCY.format(100) // "Le 100.00"
   */
  format(amount: number): string {
    return formatCurrency(amount, this.code);
  },

  /**
   * Format a monetary amount without the currency symbol
   * Requirements: 1.2, 1.3
   * 
   * @param amount - The numeric amount to format
   * @returns Formatted string with two decimal places and comma separators (no symbol)
   * @example
   * CURRENCY.formatWithoutSymbol(1234.56) // "1,234.56"
   */
  formatWithoutSymbol(amount: number): string {
    return formatCurrencyWithoutSymbol(amount, this.code);
  },

  /**
   * Format a monetary amount in compact form (for space-constrained displays)
   * Requirements: 1.1, 1.2, 1.3
   * 
   * @param amount - The numeric amount to format
   * @returns Formatted string with "Le" prefix and compact notation for large numbers
   * @example
   * CURRENCY.formatCompact(1234.56) // "Le 1,234.56"
   * CURRENCY.formatCompact(1234567.89) // "Le 1.23M"
   */
  formatCompact(amount: number): string {
    return formatCurrencyCompact(amount, this.code);
  },

  /**
   * Parse a formatted currency string back to a number
   * 
   * @param formattedAmount - The formatted currency string
   * @returns The numeric value
   * @example
   * CURRENCY.parse("Le 1,234.56") // 1234.56
   * CURRENCY.parse("1,234.56") // 1234.56
   */
  parse(formattedAmount: string): number {
    return parseCurrency(formattedAmount, this.code);
  },
};
