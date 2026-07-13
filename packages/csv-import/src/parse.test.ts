import { describe, expect, it } from 'vitest';
import { parseAccountsCsv } from './index';

describe('parseAccountsCsv', () => {
  it('normalizes CRM rows into account inputs', () => {
    const csv = [
      'name,domain,industry,employeeCount,annualRevenue,primaryCloud,estimatedCloudSpend,existingProducts,marketplaceActivity,marketplaceTransactions',
      'Globex Cloud,globex.example,Software,1400,42000000,AWS,1250000,"Marketplace Pro;Cloud Security",HIGH,18',
      'Stark Industrial,stark.example,Manufacturing,5200,175000000,multi cloud,1900000,Partner Connect,high,22',
    ].join('\n');

    const parsed = parseAccountsCsv(csv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.totalRows).toBe(2);
    expect(parsed.accounts).toMatchObject([
      {
        rowNumber: 2,
        name: 'Globex Cloud',
        domain: 'globex.example',
        employeeCount: 1400,
        primaryCloud: 'AWS',
        estimatedCloudSpend: 1250000,
        existingProducts: ['Marketplace Pro', 'Cloud Security'],
        marketplaceActivity: 'HIGH',
        marketplaceTransactions: 18,
      },
      {
        rowNumber: 3,
        name: 'Stark Industrial',
        primaryCloud: 'MULTI_CLOUD',
        marketplaceActivity: 'HIGH',
      },
    ]);
  });

  it('reports invalid rows without rejecting valid ones', () => {
    const parsed = parseAccountsCsv(
      [
        'name,domain,primaryCloud',
        ',missing-name.example,AWS',
        'Initech,initech.example,Azure',
      ].join('\n'),
    );

    expect(parsed.totalRows).toBe(2);
    expect(parsed.errors).toEqual([{ rowNumber: 2, message: 'Account name is required.' }]);
    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0]).toMatchObject({ name: 'Initech', primaryCloud: 'AZURE' });
  });

  it('strips spreadsheet formula prefixes from string fields', () => {
    const parsed = parseAccountsCsv(
      'name,domain,existingProducts\n=Acme,+acme.example,"@One;\tTwo"',
    );

    expect(parsed.accounts[0]).toMatchObject({
      name: 'Acme',
      domain: 'acme.example',
      existingProducts: ['One', 'Two'],
    });
  });
});
