/**
 * Manual verification tests for currency utility
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * 
 * Run these tests manually in the browser console or Node.js to verify functionality
 */

import { formatCurrency, formatCurrencyWithoutSymbol, formatCurrencyCompact, parseCurrency, type CurrencyCode } from './currency';

const CURRENCIES: CurrencyCode[] = ['SLE', 'USD'];
const SYMBOLS: Record<CurrencyCode, string> = { SLE: 'Le', USD: '$' };

// Test cases to verify currency formatting
export const currencyTests = {
  // Property 1: Currency symbol prefix
  testSymbolPrefix() {
    CURRENCIES.forEach((code) => {
      const result = formatCurrency(100, code);
      const expectedPrefix = `${SYMBOLS[code]} `;
      console.assert(result.startsWith(expectedPrefix), `Expected "${expectedPrefix}" prefix for ${code}, got: ${result}`);
    });
    console.log('OK Symbol prefix test passed');
  },

  // Property 2: Two decimal places
  testTwoDecimalPlaces() {
    CURRENCIES.forEach((code) => {
      const result1 = formatCurrency(100, code);
      console.assert(result1.includes('.00'), `Expected two decimal places for ${code}, got: ${result1}`);

      const result2 = formatCurrency(100.5, code);
      console.assert(result2.includes('.50'), `Expected two decimal places for ${code}, got: ${result2}`);

      const result3 = formatCurrency(100.567, code);
      console.assert(result3.includes('.57'), `Expected two decimal places (rounded) for ${code}, got: ${result3}`);
    });
    console.log('OK Two decimal places test passed');
  },

  // Property 3: Thousand separators
  testThousandSeparators() {
    CURRENCIES.forEach((code) => {
      const result1 = formatCurrency(1000, code);
      console.assert(result1.includes('1,000'), `Expected comma separator for ${code}, got: ${result1}`);

      const result2 = formatCurrency(1234567.89, code);
      console.assert(result2.includes('1,234,567'), `Expected comma separators for ${code}, got: ${result2}`);

      const result3 = formatCurrency(999, code);
      console.assert(!result3.includes(','), `Expected no comma for ${code} < 1000, got: ${result3}`);
    });
    console.log('OK Thousand separators test passed');
  },

  // Test complete formatting
  testCompleteFormatting() {
    const testCases: Record<CurrencyCode, { input: number; expected: string }[]> = {
      SLE: [
        { input: 0, expected: 'Le 0.00' },
        { input: 100, expected: 'Le 100.00' },
        { input: 1234.56, expected: 'Le 1,234.56' },
        { input: 1234567.89, expected: 'Le 1,234,567.89' },
        { input: 999.99, expected: 'Le 999.99' },
      ],
      USD: [
        { input: 0, expected: '$ 0.00' },
        { input: 100, expected: '$ 100.00' },
        { input: 1234.56, expected: '$ 1,234.56' },
        { input: 1234567.89, expected: '$ 1,234,567.89' },
        { input: 999.99, expected: '$ 999.99' },
      ],
    };

    CURRENCIES.forEach((code) => {
      testCases[code].forEach(({ input, expected }) => {
        const result = formatCurrency(input, code);
        console.assert(result === expected, `[${code}] Expected "${expected}", got: "${result}"`);
      });
    });

    console.log('OK Complete formatting test passed');
  },

  // Test formatWithoutSymbol
  testFormatWithoutSymbol() {
    CURRENCIES.forEach((code) => {
      const result1 = formatCurrencyWithoutSymbol(1234.56, code);
      console.assert(result1 === '1,234.56', `[${code}] Expected "1,234.56", got: "${result1}"`);

      const result2 = formatCurrencyWithoutSymbol(100, code);
      console.assert(result2 === '100.00', `[${code}] Expected "100.00", got: "${result2}"`);
    });

    console.log('OK Format without symbol test passed');
  },

  // Test formatCompact
  testFormatCompact() {
    CURRENCIES.forEach((code) => {
      const result1 = formatCurrencyCompact(1234.56, code);
      console.assert(result1 === `${SYMBOLS[code]} 1,234.56`, `[${code}] Expected "${SYMBOLS[code]} 1,234.56", got: "${result1}`);

      const result2 = formatCurrencyCompact(1234567.89, code);
      console.assert(result2 === `${SYMBOLS[code]} 1.23M`, `[${code}] Expected "${SYMBOLS[code]} 1.23M", got: "${result2}"`);

      const result3 = formatCurrencyCompact(1234567890, code);
      console.assert(result3 === `${SYMBOLS[code]} 1.23B`, `[${code}] Expected "${SYMBOLS[code]} 1.23B", got: "${result3}"`);
    });

    console.log('OK Format compact test passed');
  },

  // Test parse
  testParse() {
    CURRENCIES.forEach((code) => {
      const result1 = parseCurrency(`${SYMBOLS[code]} 1,234.56`, code);
      console.assert(result1 === 1234.56, `[${code}] Expected 1234.56, got: ${result1}`);

      const result2 = parseCurrency('1,234.56', code);
      console.assert(result2 === 1234.56, `[${code}] Expected 1234.56, got: ${result2}`);

      const result3 = parseCurrency('100.00', code);
      console.assert(result3 === 100, `[${code}] Expected 100, got: ${result3}`);
    });

    console.log('OK Parse test passed');
  },

  // Test invalid inputs
  testInvalidInputs() {
    CURRENCIES.forEach((code) => {
      const expected = `${SYMBOLS[code]} 0.00`;
      const result1 = formatCurrency(NaN, code);
      console.assert(result1 === expected, `[${code}] Expected "${expected}" for NaN, got: "${result1}"`);

      const result2 = formatCurrency(null as unknown as number, code);
      console.assert(result2 === expected, `[${code}] Expected "${expected}" for null, got: "${result2}"`);

      const result3 = formatCurrency(undefined as unknown as number, code);
      console.assert(result3 === expected, `[${code}] Expected "${expected}" for undefined, got: "${result3}"`);
    });

    console.log('OK Invalid inputs test passed');
  },

  // Run all tests
  runAll() {
    console.log('Running currency utility tests...\n');
    this.testSymbolPrefix();
    this.testTwoDecimalPlaces();
    this.testThousandSeparators();
    this.testCompleteFormatting();
    this.testFormatWithoutSymbol();
    this.testFormatCompact();
    this.testParse();
    this.testInvalidInputs();
    console.log('\nOK All currency utility tests passed!');
  },
};

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  currencyTests.runAll();
}
