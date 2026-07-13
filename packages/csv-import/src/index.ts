import {
  CloudProviderSchema,
  MarketplaceActivitySchema,
  type CloudProvider,
  type MarketplaceActivity,
} from '@cloud-gtm/contracts';

/**
 * Normalizes a raw marketplace-activity string from a CRM export into the
 * canonical enum. Full CSV parsing/validation lands in the M5 import pipeline.
 */
export function normalizeMarketplaceActivity(
  raw: string | undefined,
): MarketplaceActivity | undefined {
  if (!raw) return undefined;
  const candidate = raw.trim().toUpperCase();
  const result = MarketplaceActivitySchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}

/** Removes leading characters that spreadsheet apps interpret as formulas. */
export function stripFormulaPrefix(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, '').trim();
}

export interface CsvAccountRow {
  rowNumber: number;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  primaryCloud: CloudProvider;
  estimatedCloudSpend?: number;
  existingProducts: string[];
  marketplaceActivity?: MarketplaceActivity;
  marketplaceTransactions?: number;
}

export interface CsvImportRowError {
  rowNumber: number;
  message: string;
}

export interface ParsedCsvImport {
  accounts: CsvAccountRow[];
  errors: CsvImportRowError[];
  totalRows: number;
}

const HEADER_ALIASES: Record<string, keyof Omit<CsvAccountRow, 'rowNumber'>> = {
  name: 'name',
  accountname: 'name',
  company: 'name',
  domain: 'domain',
  website: 'domain',
  industry: 'industry',
  employeecount: 'employeeCount',
  employees: 'employeeCount',
  annualrevenue: 'annualRevenue',
  revenue: 'annualRevenue',
  primarycloud: 'primaryCloud',
  cloudprovider: 'primaryCloud',
  estimatedcloudspend: 'estimatedCloudSpend',
  cloudspend: 'estimatedCloudSpend',
  existingproducts: 'existingProducts',
  products: 'existingProducts',
  marketplaceactivity: 'marketplaceActivity',
  marketplacetransactions: 'marketplaceTransactions',
};

function headerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const normalized = stripFormulaPrefix(raw).replace(/[$,\s]/g, '');
  if (!normalized) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizeCloudProvider(raw: string | undefined): CloudProvider {
  if (!raw) return 'UNKNOWN';
  const candidate = stripFormulaPrefix(raw)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const normalized =
    candidate === 'MULTICLOUD' || candidate === 'MULTI_CLOUD' ? 'MULTI_CLOUD' : candidate;
  const result = CloudProviderSchema.safeParse(normalized);
  return result.success ? result.data : 'UNKNOWN';
}

function splitProducts(raw: string | undefined): string[] {
  if (!raw) return [];
  return stripFormulaPrefix(raw)
    .split(/[;|]/)
    .map((value) => stripFormulaPrefix(value))
    .filter(Boolean);
}

/** Parses a CRM CSV export into normalized account rows and row-level errors. */
export function parseAccountsCsv(text: string): ParsedCsvImport {
  const rows = parseCsv(text);
  const [header, ...dataRows] = rows;
  if (!header) {
    return {
      accounts: [],
      errors: [{ rowNumber: 1, message: 'CSV file is empty.' }],
      totalRows: 0,
    };
  }

  const columns = header.map((value) => HEADER_ALIASES[headerKey(value)]);
  const accounts: CsvAccountRow[] = [];
  const errors: CsvImportRowError[] = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2;
    const values = new Map<keyof CsvAccountRow, string>();
    cells.forEach((cell, cellIndex) => {
      const column = columns[cellIndex];
      if (column) values.set(column, stripFormulaPrefix(cell));
    });

    const name = values.get('name');
    if (!name) {
      errors.push({ rowNumber, message: 'Account name is required.' });
      return;
    }

    const domain = values.get('domain');
    const industry = values.get('industry');
    const employeeCount = parseNumber(values.get('employeeCount'));
    const annualRevenue = parseNumber(values.get('annualRevenue'));
    const estimatedCloudSpend = parseNumber(values.get('estimatedCloudSpend'));
    const marketplaceActivity = normalizeMarketplaceActivity(values.get('marketplaceActivity'));
    const marketplaceTransactions = parseNumber(values.get('marketplaceTransactions'));

    accounts.push({
      rowNumber,
      name,
      primaryCloud: normalizeCloudProvider(values.get('primaryCloud')),
      existingProducts: splitProducts(values.get('existingProducts')),
      ...(domain !== undefined && { domain }),
      ...(industry !== undefined && { industry }),
      ...(employeeCount !== undefined && { employeeCount: Math.trunc(employeeCount) }),
      ...(annualRevenue !== undefined && { annualRevenue }),
      ...(estimatedCloudSpend !== undefined && { estimatedCloudSpend }),
      ...(marketplaceActivity !== undefined && { marketplaceActivity }),
      ...(marketplaceTransactions !== undefined && {
        marketplaceTransactions: Math.trunc(marketplaceTransactions),
      }),
    });
  });

  return { accounts, errors, totalRows: dataRows.length };
}
