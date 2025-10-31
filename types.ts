export enum TransactionType {
  COST = 'COST',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
}

export enum IncomeType {
  WORK = 'Work',
  EXTRA = 'Extra',
}

export enum CostCategory {
  MUST = 'MUST',
  WANTS = 'WANTS',
}

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
}

export type MustSubCategory = 'HOME' | 'MOVEMENT' | 'HEALTH' | 'OTHER';
export type WantsSubCategory = 'FUN' | 'SHOPPING' | 'SUBSCRIPTIONS' | 'TRAVEL' | 'GIFTS' | 'HOBBY' | 'OTHER';

export type HomeDetail = 'RENT' | 'ELECTR_POWER' | 'INTERNET' | 'PHONE' | 'SUPERMARKET' | 'WATER' | 'OTHER';
export type MovementDetail = 'GAS' | 'WASHING' | 'OTHER';
export type FunDetail = 'FOOD' | 'DRINKS' | 'CINEMA' | 'OPAP' | 'BOWLING' | 'OTHER';
export type ShoppingDetail = 'JUMBO' | 'HAIRCUT' | 'OTHER';
export type HealthDetail = 'OTHER';
export type SubscriptionsDetail = 'OTHER';
export type TravelDetail = 'OTHER';
export type GiftsDetail = 'OTHER';
export type HobbyDetail = 'OTHER';


export type DetailCategory = HomeDetail | MovementDetail | FunDetail | ShoppingDetail | HealthDetail | SubscriptionsDetail | TravelDetail | GiftsDetail | HobbyDetail;

// FIX: Changed `interface` to `type` to correctly define `CustomCategories` as a mapped type, which is not allowed inside an interface.
export type CustomCategories = {
  [key in CostCategory]?: {
    // Stores custom subcategory names for MUST or WANTS
    newSubCategories?: string[];
    // Stores custom details under a given subcategory (predefined or custom)
    // The key is the subcategory name, value is an array of detail names.
    subCategories?: {
      [subCategoryName: string]: string[];
    };
  };
};

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO string
  description: string;
  
  // For COST/INCOME
  accountId?: string;
  category?: CostCategory;
  subCategory?: MustSubCategory | WantsSubCategory | string;
  detail?: DetailCategory | string;
  incomeType?: IncomeType;

  // For TRANSFER
  fromAccountId?: string;
  toAccountId?: string;
  toAmount?: number; // The amount after currency conversion
}

export type AccountType = 'Bank' | 'Brokerage' | 'Cash' | 'Crypto';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: Currency;
}

export interface Budget {
  monthlyIncome: number;
  mustPercentage: number;

  wantsPercentage: number;
  savingsPercentage: number;
}

export enum InvestmentTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND',
}

export type InvestmentType = 'Stock' | 'ETF' | 'Crypto';

export interface InvestmentHolding {
  id: string;
  name: string;
  ticker: string;
  investmentType: InvestmentType;
  currency: Currency;
  currentPrice?: number;
  priceLastUpdated?: string;
  startOfYearPrice?: number;
  isin?: string;
  isinVerified?: boolean;
  needsReview?: boolean;
}

export interface InvestmentTransaction {
  id: string;
  holdingId: string;
  type: InvestmentTransactionType;
  date: string; // ISO string
  quantity: number;
  pricePerUnit: number;
  totalAmount: number; 
  accountId: string;
}

export interface MonthlySummary {
  id: string; // "YYYY-MM"
  year: number;
  month: number; // 0-11
  totalIncome: number;
  totalSpending: number;
  mustSpending: number;
  wantsSpending: number;
  netSavings: number;
  endOfMonthCash: number;
  endOfMonthInvestments?: number;
  endOfMonthInvestmentsStocks?: number;
  endOfMonthInvestmentsEtfs?: number;
  endOfMonthInvestmentsCrypto?: number;
}

export interface ReportData {
    id: string; // YYYY-MM
    year: number;
    month: number;
    summary: {
        totalIncome: number;
        totalSpending: number;
        netSavings: number;
        netInvestments: number;
        savingsRate: number;
        investmentRate: number;
        cashFlow: number;
        endOfMonthCash: number;
        endOfMonthInvestments: number;
        endOfMonthInvestmentsStocks?: number;
        endOfMonthInvestmentsEtfs?: number;
        endOfMonthInvestmentsCrypto?: number;
    };
    incomeDetails: {
        workIncome: number;
        extraIncome: Transaction[];
        dividends: InvestmentTransaction[];
    };
    expenseDetails: {
        mustSpending: number;
        wantsSpending: number;
        transactions: Transaction[];
        bySubCategory: { [key: string]: { total: number, category: CostCategory } };
    };
    investmentDetails: {
        buys: InvestmentTransaction[];
        sells: InvestmentTransaction[];
        performance: {
            total: number;
            stocks: number;
            etfs: number;
            crypto: number;
        };
        startValue: number;
        endValue: number;
        netInflows: number;
    };
}