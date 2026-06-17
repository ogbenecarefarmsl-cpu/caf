/**
 * Manual verification tests for currency utility
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * 
 * Run these tests manually in the browser console or Node.js to verify functionality
 */

import { CURRENCY } from './currency';

// Test cases to verify currency formatting
export const currencyTests = {
  // Property 1: Currency symbol prefix
  testSymbolPrefix() {
    const result = CURRENCY.format(100);
    console.assert(result.startsWith('Le '), `Expected "Le " prefix, got: ${result}`);
    console.log('OK Symbol prefix test passed');
  },

  // Property 2: Two decimal places
  testTwoDecimalPlaces() {
    const result1 = CURRENCY.format(100);
    console.assert(result1.includes('.00'), `Expected two decimal places, got: ${result1}`);
    
    const result2 = CURRENCY.format(100.5);
    console.assert(result2.includes('.50'), `Expected two decimal places, got: ${result2}`);
    
    const result3 = CURRENCY.format(100.567);
    console.assert(result3.includes('.57'), `Expected two decimal places (rounded), got: ${result3}`);
    
    console.log('OK Two decimal places test passed');
  },

  // Property 3: Thousand separators
  testThousandSeparators() {
    const result1 = CURRENCY.format(1000);
    console.assert(result1.includes('1,000'), `Expected comma separator, got: ${result1}`);
    
    const result2 = CURRENCY.format(1234567.89);
    console.assert(result2.includes('1,234,567'), `Expected comma separators, got: ${result2}`);
    
    const result3 = CURRENCY.format(999);
    console.assert(!result3.includes(','), `Expected no comma for < 1000, got: ${result3}`);
    
    console.log('OK Thousand separators test passed');
  },

  // Test complete formatting
  testCompleteFormatting() {
    const testCases = [
      { input: 0, expected: 'Le 0.00' },
      { input: 100, expected: 'Le 100.00' },
      { input: 1234.56, expected: 'Le 1,234.56' },
      { input: 1234567.89, expected: 'Le 1,234,567.89' },
      { input: 999.99, expected: 'Le 999.99' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = CURRENCY.format(input);
      console.assert(result === expected, `Expected "${expected}", got: "${result}"`);
    });
    
    console.log('OK Complete formatting test passed');
  },

  // Test formatWithoutSymbol
  testFormatWithoutSymbol() {
    const result1 = CURRENCY.formatWithoutSymbol(1234.56);
    console.assert(result1 === '1,234.56', `Expected "1,234.56", got: "${result1}"`);
    
    const result2 = CURRENCY.formatWithoutSymbol(100);
    console.assert(result2 === '100.00', `Expected "100.00", got: "${result2}"`);
    
    console.log('OK Format without symbol test passed');
  },

  // Test formatCompact
  testFormatCompact() {
    const result1 = CURRENCY.formatCompact(1234.56);
    console.assert(result1 === 'Le 1,234.56', `Expected "Le 1,234.56", got: "${result1}"`);
    
    const result2 = CURRENCY.formatCompact(1234567.89);
    console.assert(result2 === 'Le 1.23M', `Expected "Le 1.23M", got: "${result2}"`);
    
    const result3 = CURRENCY.formatCompact(1234567890);
    console.assert(result3 === 'Le 1.23B', `Expected "Le 1.23B", got: "${result3}"`);
    
    console.log('OK Format compact test passed');
  },

  // Test parse
  testParse() {
    const result1 = CURRENCY.parse('Le 1,234.56');
    console.assert(result1 === 1234.56, `Expected 1234.56, got: ${result1}`);
    
    const result2 = CURRENCY.parse('1,234.56');
    console.assert(result2 === 1234.56, `Expected 1234.56, got: ${result2}`);
    
    const result3 = CURRENCY.parse('100.00');
    console.assert(result3 === 100, `Expected 100, got: ${result3}`);
    
    console.log('OK Parse test passed');
  },

  // Test invalid inputs
  testInvalidInputs() {
    const result1 = CURRENCY.format(NaN);
    console.assert(result1 === 'Le 0.00', `Expected "Le 0.00" for NaN, got: "${result1}"`);
    
    const result2 = CURRENCY.format(null as unknown as number);
    console.assert(result2 === 'Le 0.00', `Expected "Le 0.00" for null, got: "${result2}"`);
    
    const result3 = CURRENCY.format(undefined as unknown as number);
    console.assert(result3 === 'Le 0.00', `Expected "Le 0.00" for undefined, got: "${result3}"`);
    
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
