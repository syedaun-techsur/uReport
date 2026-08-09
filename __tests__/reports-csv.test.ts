// __tests__/reports-csv.test.ts
import { describe, it, expect } from 'vitest';
import { toCsv, escapeCsvField } from '@/lib/reports/csv';

describe('escapeCsvField', () => {
  it('leaves simple values untouched', () => {
    expect(escapeCsvField('open')).toBe('open');
    expect(escapeCsvField(42)).toBe('42');
  });
  it('renders null/undefined as an empty field', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
  it('quote-wraps values containing a comma', () => {
    expect(escapeCsvField('Pothole, large')).toBe('"Pothole, large"');
  });
  it('doubles internal double-quotes and wraps', () => {
    expect(escapeCsvField('the "main" st')).toBe('"the ""main"" st"');
  });
  it('quote-wraps values containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('serializes a header row and data rows with CRLF endings', () => {
    const csv = toCsv(
      ['reference_id', 'status', 'category'],
      [
        ['abc123', 'open', 'Roads'],
        ['def456', 'closed', 'Parks, & Rec'],
      ]
    );
    expect(csv).toBe(
      'reference_id,status,category\r\n' +
        'abc123,open,Roads\r\n' +
        'def456,closed,"Parks, & Rec"\r\n'
    );
  });
  it('handles an empty row set (headers only)', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b\r\n');
  });
});
