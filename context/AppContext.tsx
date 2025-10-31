


import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
// FIX: Add `IncomeType` and `AccountType` to the import from `../types` to resolve the "Cannot find name 'IncomeType' and 'AccountType'" error.
import { Transaction, Account, Budget, InvestmentHolding, InvestmentTransaction, TransactionType, InvestmentTransactionType, Currency, MonthlySummary, CostCategory, ReportData, CustomCategories, MustSubCategory, WantsSubCategory, InvestmentType, IncomeType, AccountType } from '../types';
import { GoogleGenAI } from "@google/genai";
import { generateTestData } from '../utils/testData';

interface ExchangeRate {
  USDtoEUR: number;
  lastUpdated: string; // YYYY-MM-DD
}

// User log format from uploaded file
interface HistoricalExpenseLog {
  month: string; // "YYYY-MM"
  group: 'Must' | 'Wants';
  category: string;
  sub: string;
  amount: number;
}

interface DividendLog {
    stock: string;
    amount: number;
    currency: "USD" | "EUR";
    platform: string;
    date: string; // "DD/MM/YYYY"
    type: "Dividend";
}

interface MonthEndLog {
    month: string; // "YYYY-MM"
    income: {
        work: number;
        extra: number;
    };
    endOfMonth: {
        cash: number;
        investments: {
            stocksEtfs: number;
            crypto: number;
            total: number;
        };
    };
}

interface InvestmentLog {
    source: "ETF" | "Stock" | "Crypto";
    platform: string;
    ticker: string;
    date: string; // "YYYY-MM-DD"
    price: number;
    quantity: number;
    currency: "USD" | "EUR";
    type: "Buy" | "Sell";
    isin?: string;
    ISIN?: string;
    TCOST?: number;
    tcost?: number;
}

interface AccountsBalancesLog {
  accounts: {
    [key: string]: {
      [accountName: string]: number;
    };
  };
}


interface AppContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  moveFunds: (details: { fromAccountId: string, toAccountId: string, amount: number, date: string, description: string }) => void;
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (accountId: string) => void;
  reorderAccounts: (reorderedAccounts: Account[]) => void;
  budget: Budget;
  updateBudget: (budget: Budget) => void;
  getAccountBalance: (accountId: string) => number;
  getAccountBalanceAtDate: (accountId: string, endDate: Date) => number;
  investmentHoldings: InvestmentHolding[];
  addInvestmentHolding: (holding: Omit<InvestmentHolding, 'id'>) => void;
  updateInvestmentHolding: (holding: InvestmentHolding) => void;
  investmentTransactions: InvestmentTransaction[];
  addInvestmentTransaction: (transaction: Omit<InvestmentTransaction, 'id'>) => void;
  exchangeRate: ExchangeRate;
  convertCurrency: (amount: number, from: Currency, to: Currency) => number;
  getCurrencySymbol: (currency: Currency) => string;
  monthlySummaries: MonthlySummary[];
  reports: ReportData[];
  saveReport: (reportData: ReportData) => void;
  loadTestData: () => void;
  loadAllHistoricalData: (data: { expensesJson?: string, dividendsJson?: string, monthEndJson?: string, investmentsJson?: string }) => void;
  importAllData: (jsonData: string) => void;
  customCategories: CustomCategories;
  addCustomDetail: (category: CostCategory, subCategory: MustSubCategory | WantsSubCategory | string, detail: string) => void;
  addCustomSubCategory: (category: CostCategory, subCategory: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
  const [budget, setBudget] = useLocalStorage<Budget>('budget', {
    monthlyIncome: 3000,
    mustPercentage: 50,
    wantsPercentage: 30,
    savingsPercentage: 20,
  });
  const [investmentHoldings, setInvestmentHoldings] = useLocalStorage<InvestmentHolding[]>('investmentHoldings', []);
  const [investmentTransactions, setInvestmentTransactions] = useLocalStorage<InvestmentTransaction[]>('investmentTransactions', []);
  const [exchangeRate, setExchangeRate] = useLocalStorage<ExchangeRate>('exchangeRate', {
    USDtoEUR: 0.93, // Default rate
    lastUpdated: '',
  });
  const [monthlySummaries, setMonthlySummaries] = useLocalStorage<MonthlySummary[]>('monthlySummaries', []);
  const [reports, setReports] = useLocalStorage<ReportData[]>('reports', []);
  const [customCategories, setCustomCategories] = useLocalStorage<CustomCategories>('customCategories', {});


  // Data migration for users from previous versions
  useEffect(() => {
    const needsAccountMigration = accounts.some(acc => !acc.currency);
    if (needsAccountMigration) {
      setAccounts(prev => prev.map(acc => ({ ...acc, currency: acc.currency || Currency.EUR })));
    }
    const needsHoldingMigration = investmentHoldings.some(h => !h.currency);
    if (needsHoldingMigration) {
      setInvestmentHoldings(prev => prev.map(h => ({ ...h, currency: h.currency || Currency.USD })));
    }
  }, []);

  useEffect(() => {
    const updateExchangeRateIfNeeded = async () => {
      const today = new Date().toISOString().split('T')[0];
      if (exchangeRate.lastUpdated === today) {
        return;
      }

      console.log('Fetching daily exchange rate...');
      try {
        const ai = new GoogleGenAI({
          apiKey: import.meta.env.VITE_EXCHANGE_API_KEY,
        });
        const prompt = "What is the latest closing exchange rate from USD to EUR? Respond with only the numerical value, for example: 0.93";
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const rateText = response.text.trim();
        const rate = parseFloat(rateText);

        if (!isNaN(rate) && rate > 0) {
          console.log(`Updated USD to EUR rate: ${rate}`);
          setExchangeRate({ USDtoEUR: rate, lastUpdated: today });
        } else {
            console.error("Failed to parse exchange rate from response:", rateText);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
      }
    };

    updateExchangeRateIfNeeded();
  }, []); // Run once on app load

  const convertCurrency = useCallback((amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount;
    if (from === Currency.USD && to === Currency.EUR) {
        return amount * exchangeRate.USDtoEUR;
    }
    if (from === Currency.EUR && to === Currency.USD) {
        return amount / exchangeRate.USDtoEUR;
    }
    return amount;
  }, [exchangeRate]);

  const getAccountBalanceAtDate = useCallback((accountId: string, endDate: Date, allTransactions: Transaction[], allInvestmentTransactions: InvestmentTransaction[], allAccounts: Account[], allHoldings: InvestmentHolding[]): number => {
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;
    
    const relevantTransactions = allTransactions.filter(t => new Date(t.date) <= endDate);

    relevantTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME && t.accountId === accountId) {
        balance += t.amount;
      } else if (t.type === TransactionType.COST && t.accountId === accountId) {
        balance -= t.amount;
      } else if (t.type === TransactionType.TRANSFER) {
        if (t.fromAccountId === accountId) {
          balance -= t.amount;
        } else if (t.toAccountId === accountId && typeof t.toAmount === 'number') {
          balance += t.toAmount;
        }
      }
    });

    const relevantInvestmentTransactions = allInvestmentTransactions.filter(t => t.accountId === accountId && new Date(t.date) <= endDate);
    relevantInvestmentTransactions.forEach(t => {
        const holding = allHoldings.find(h => h.id === t.holdingId);
        if (!holding) return;

        const amountInAccountCurrency = convertCurrency(t.totalAmount, holding.currency, account.currency);

        if(t.type === InvestmentTransactionType.BUY) {
            balance -= amountInAccountCurrency;
        } else if (t.type === InvestmentTransactionType.SELL || t.type === InvestmentTransactionType.DIVIDEND) {
            balance += amountInAccountCurrency;
        }
    });

    return balance;
  }, [convertCurrency]);

  const getAccountBalanceAtDateForContext = useCallback((accountId: string, endDate: Date): number => {
      return getAccountBalanceAtDate(accountId, endDate, transactions, investmentTransactions, accounts, investmentHoldings);
  }, [getAccountBalanceAtDate, transactions, investmentTransactions, accounts, investmentHoldings]);

  const generateMonthlySummary = useCallback((month: number, year: number, currentTransactions: Transaction[], currentAccounts: Account[], currentInvestmentTransactions: InvestmentTransaction[], currentInvestmentHoldings: InvestmentHolding[]): MonthlySummary => {
      // Use UTC dates to avoid timezone issues
      const startDate = new Date(Date.UTC(year, month, 1));
      const endDate = new Date(Date.UTC(year, month + 1, 1));
      endDate.setUTCMilliseconds(-1); // End of the last day of the month

      const getAccountCurrency = (accountId: string): Currency => {
          return currentAccounts.find(a => a.id === accountId)?.currency || Currency.EUR;
      };

      const monthTransactions = currentTransactions.filter(t => {
          const tDate = new Date(t.date); // 'YYYY-MM-DD' is parsed as UTC midnight
          return tDate >= startDate && tDate <= endDate;
      });

      const mustSpending = monthTransactions
          .filter(t => t.category === CostCategory.MUST)
          .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
      
      const wantsSpending = monthTransactions
          .filter(t => t.category === CostCategory.WANTS)
          .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
      
      const totalIncome = monthTransactions
          .filter(t => t.type === TransactionType.INCOME)
          .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
      
      const totalSpending = mustSpending + wantsSpending;
      const netSavings = totalIncome - totalSpending;
      
      const endOfMonthCashBalance = currentAccounts.reduce((sum, acc) => {
          const balance = getAccountBalanceAtDate(acc.id, endDate, currentTransactions, currentInvestmentTransactions, currentAccounts, currentInvestmentHoldings);
          return sum + convertCurrency(balance, acc.currency, Currency.EUR);
      }, 0);

      const summaryId = `${year}-${String(month + 1).padStart(2, '0')}`;

      return {
          id: summaryId, year, month, totalIncome, totalSpending, mustSpending, wantsSpending, netSavings,
          endOfMonthCash: endOfMonthCashBalance,
      };
  }, [convertCurrency, getAccountBalanceAtDate]);

  useEffect(() => {
    const checkForNewSummary = () => {
        const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthDate = new Date(firstDayOfCurrentMonth.getTime()); // Create a clone
        lastMonthDate.setDate(0); 
        
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();
        
        const summaryId = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`;
        const summaryExists = monthlySummaries.some(s => s.id === summaryId);
        
        const hasTransactionsLastMonth = transactions.some(t => {
            const tDate = new Date(t.date); // 'YYYY-MM-DD' is UTC
            return tDate.getUTCMonth() === lastMonth && tDate.getUTCFullYear() === lastMonthYear;
        });

        if (!summaryExists && hasTransactionsLastMonth) {
            console.log(`Generating summary for ${summaryId}...`);
            const newSummary = generateMonthlySummary(lastMonth, lastMonthYear, transactions, accounts, investmentTransactions, investmentHoldings);
            setMonthlySummaries(prev => [...prev, newSummary].sort((a, b) => b.id.localeCompare(a.id)));
        }
    };
    
    if (accounts.length > 0 || transactions.length > 0) {
       checkForNewSummary();
    }
  }, [accounts, transactions, investmentTransactions, investmentHoldings, monthlySummaries, generateMonthlySummary, setMonthlySummaries]); 

  const processAndSetLoadedData = useCallback((
      data: { 
          accounts: Account[], 
          transactions: Transaction[], 
          investmentHoldings: InvestmentHolding[], 
          investmentTransactions: InvestmentTransaction[] 
      }, 
      newCategories?: CustomCategories,
      newSummaries?: MonthlySummary[]
    ) => {
    setAccounts(data.accounts);
    setTransactions(data.transactions);
    setInvestmentHoldings(data.investmentHoldings);
    setInvestmentTransactions(data.investmentTransactions);
    setReports([]); // Clear old reports
    setCustomCategories(newCategories || {});
    
    if (newSummaries && newSummaries.length > 0) {
        setMonthlySummaries(newSummaries.sort((a, b) => b.id.localeCompare(a.id)));
        return;
    }
    
    const transactionMonths = new Set<string>();
    data.transactions.forEach(t => {
        const date = new Date(t.date);
        transactionMonths.add(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
    });
    data.investmentTransactions.forEach(t => {
        const date = new Date(t.date);
        transactionMonths.add(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
    });

    const calculatedSummaries: MonthlySummary[] = [];
    transactionMonths.forEach(ymString => {
        const [yearStr, monthStr] = ymString.split('-');
        const summary = generateMonthlySummary(parseInt(monthStr), parseInt(yearStr), data.transactions, data.accounts, data.investmentTransactions, data.investmentHoldings);
        calculatedSummaries.push(summary);
    });
    
    setMonthlySummaries(calculatedSummaries.sort((a, b) => b.id.localeCompare(a.id)));
  }, [generateMonthlySummary, setAccounts, setTransactions, setInvestmentHoldings, setInvestmentTransactions, setMonthlySummaries, setReports, setCustomCategories]);


  const loadTestData = useCallback(() => {
    const data = generateTestData();
    processAndSetLoadedData(data, {});
  }, [processAndSetLoadedData]);
  
  const loadAllHistoricalData = useCallback((jsonData: { expensesJson?: string, dividendsJson?: string, monthEndJson?: string, investmentsJson?: string }) => {
    let expenseLogs: HistoricalExpenseLog[] = [];
    let dividendLogs: DividendLog[] = [];
    let investmentLogs: InvestmentLog[] = [];
    let monthEndLogs: MonthEndLog[] = [];
    let accountsBalancesLog: AccountsBalancesLog | null = null;
    
    // --- 1. PARSE ALL JSON FILES ---
    if (jsonData.expensesJson) try { expenseLogs = JSON.parse(jsonData.expensesJson); } catch (e) { throw new Error(`Invalid Expenses JSON: ${e.message}`); }
    if (jsonData.dividendsJson) try { dividendLogs = JSON.parse(jsonData.dividendsJson); } catch (e) { throw new Error(`Invalid Dividends JSON: ${e.message}`); }
    if (jsonData.investmentsJson) try { investmentLogs = JSON.parse(jsonData.investmentsJson); } catch (e) { throw new Error(`Invalid Investments JSON: ${e.message}`); }
    if (jsonData.monthEndJson) {
      try {
        const parsedData = JSON.parse(jsonData.monthEndJson);
        if (Array.isArray(parsedData)) {
          const lastElement = parsedData[parsedData.length - 1];
          if (lastElement && typeof lastElement === 'object' && lastElement.hasOwnProperty('accounts')) {
            accountsBalancesLog = lastElement as AccountsBalancesLog;
            monthEndLogs = parsedData.slice(0, -1) as MonthEndLog[];
          } else {
            monthEndLogs = parsedData as MonthEndLog[];
          }
        }
      } catch (e) { throw new Error(`Invalid Month End JSON: ${e.message}`); }
    }
    
    if (!expenseLogs.length && !dividendLogs.length && !monthEndLogs.length && !investmentLogs.length) {
        throw new Error("No data found in any of the provided files.");
    }
    
    const now = new Date();
    monthEndLogs = monthEndLogs.filter(log => new Date(log.month) < now);

    const randomDate = (year: number, month: number, startDay = 1, endDay = 28): string => {
        const date = new Date(year, month, startDay + Math.floor(Math.random() * (endDay - startDay)));
        return date.toISOString().split('T')[0];
    };

    let historicalTransactions: Transaction[] = [];
    let historicalInvestmentTransactions: InvestmentTransaction[] = [];
    const newCustomCategories: CustomCategories = {};
    const allMonths = new Set<string>();

    // --- 2. DISCOVER & CREATE ACCOUNTS AND HOLDINGS ---
    const finalAccountsMap = new Map<string, Account>();
    let accountIdCounter = 0;

    // A. Create accounts from the balance log if it exists (source of truth)
    if (accountsBalancesLog) {
      for (const typeStr in accountsBalancesLog.accounts) {
        const type = typeStr as AccountType;
        const accountsOfType = accountsBalancesLog.accounts[typeStr];
        for (const name in accountsOfType) {
          if (!finalAccountsMap.has(name)) {
            let currency = Currency.EUR; // Default to EUR
            if (type === 'Brokerage') {
              const brokerageLog = [...investmentLogs, ...dividendLogs].find(log => log.platform === name);
              if (brokerageLog) currency = brokerageLog.currency === 'USD' ? Currency.USD : Currency.EUR;
            }
            finalAccountsMap.set(name, { id: `hist-acc-${accountIdCounter++}`, name, type, initialBalance: 0, currency });
          }
        }
      }
    }
    
    // B. Discover holdings from investment/dividend files
    const discoveredHoldings = new Map<string, Omit<InvestmentHolding, 'id'>>();
    [...investmentLogs, ...dividendLogs].forEach(log => {
        const ticker = ('ticker' in log ? log.ticker : log.stock).toUpperCase();
        // Handle both 'isin' (lowercase) and 'ISIN' (uppercase) from JSON file
        const isinValue = (log as any).isin || (log as any).ISIN;
        const isin = isinValue ? String(isinValue) : undefined;

        if (!discoveredHoldings.has(ticker)) {
            const currency = log.currency === 'USD' ? Currency.USD : Currency.EUR;
            const investmentType: InvestmentType = 'source' in log && (log.source === 'Stock' || log.source === 'ETF' || log.source === 'Crypto')
                ? log.source as InvestmentType
                : (ticker.includes('BTC') || ticker.includes('ETH') ? 'Crypto' : (ticker.includes('.') ? 'ETF' : 'Stock'));
            
            const needsReview = investmentType === 'Crypto';

            discoveredHoldings.set(ticker, { name: ticker, ticker, investmentType, currency, isin, needsReview });
        } else {
            // If the holding is already discovered, but this log entry has an ISIN and the discovered one doesn't, update it.
            const existingHolding = discoveredHoldings.get(ticker);
            if (existingHolding && !existingHolding.isin && isin) {
                existingHolding.isin = isin;
                discoveredHoldings.set(ticker, existingHolding);
            }
        }
    });

    // C. If no balance log, discover accounts from transactions
    if (!accountsBalancesLog) {
        // Add a default bank account for expenses
        finalAccountsMap.set('Legacy Bank (EUR)', { id: `hist-acc-${accountIdCounter++}`, name: 'Legacy Bank (EUR)', type: 'Bank', initialBalance: 8000, currency: Currency.EUR });
        
        [...investmentLogs, ...dividendLogs].forEach(log => {
            const platformAccountName = `Brokerage (${log.platform})`;
            if (!finalAccountsMap.has(platformAccountName)) {
                finalAccountsMap.set(platformAccountName, { id: `hist-acc-${accountIdCounter++}`, name: platformAccountName, type: 'Brokerage', initialBalance: 0, currency: log.currency === 'USD' ? Currency.USD : Currency.EUR });
            }
        });
    }

    // D. Ensure a bank account exists for expenses
    if (!Array.from(finalAccountsMap.values()).some(acc => acc.type === 'Bank')) {
        finalAccountsMap.set('Default Bank (EUR)', { id: `hist-acc-${accountIdCounter++}`, name: 'Default Bank (EUR)', type: 'Bank', initialBalance: 0, currency: Currency.EUR });
    }

    const finalHoldings: InvestmentHolding[] = Array.from(discoveredHoldings.values()).map((h, i) => ({ ...h, id: `hist-hold-${i}`}));
    const accountNameToId = new Map(Array.from(finalAccountsMap.values()).map(a => [a.name, a.id]));
    const tickerToHoldingId = new Map(finalHoldings.map(h => [h.ticker, h.id]));
    const bankAccountId = Array.from(finalAccountsMap.values()).find(a => a.type === 'Bank')?.id || Array.from(finalAccountsMap.values())[0].id;

    // --- 3. PROCESS ALL TRANSACTION LOGS ---
    investmentLogs.forEach((log, index) => {
        const holdingId = tickerToHoldingId.get(log.ticker.toUpperCase());
        const accountId = accountNameToId.get(log.platform); // Assumes platform name matches account name from balance file
        if (!holdingId || !accountId) return;
        
        const transactionCost = log.TCOST || log.tcost || 0;
        let totalAmount = log.quantity * log.price;

        if (log.type === 'Buy') {
            totalAmount += transactionCost;
        } else if (log.type === 'Sell') {
            totalAmount -= transactionCost;
        }

        historicalInvestmentTransactions.push({
            id: `hist-invest-${log.date}-${index}`, holdingId, accountId,
            type: log.type === 'Buy' ? InvestmentTransactionType.BUY : InvestmentTransactionType.SELL,
            date: log.date, quantity: log.quantity, pricePerUnit: log.price, totalAmount: totalAmount,
        });
    });

    dividendLogs.forEach((log, index) => {
        const [day, month, year] = log.date.split('/');
        const isoDate = `${year}-${month}-${day}`;
        const holdingId = tickerToHoldingId.get(log.stock.toUpperCase());
        const accountId = accountNameToId.get(log.platform);
        if (!holdingId || !accountId) return;

        historicalInvestmentTransactions.push({
            id: `hist-div-${isoDate}-${index}`, holdingId, accountId,
            type: InvestmentTransactionType.DIVIDEND,
            date: isoDate, quantity: 0, pricePerUnit: 0, totalAmount: log.amount,
        });
    });

    expenseLogs.forEach((log, index) => {
        allMonths.add(log.month);
        const [year, month] = log.month.split('-').map(Number);
        const category = log.group === 'Must' ? CostCategory.MUST : CostCategory.WANTS;
        if (!newCustomCategories[category]) newCustomCategories[category] = { newSubCategories: [], subCategories: {} };
        if (!newCustomCategories[category]!.newSubCategories!.includes(log.category)) newCustomCategories[category]!.newSubCategories!.push(log.category);
        if (!newCustomCategories[category]!.subCategories![log.category]) newCustomCategories[category]!.subCategories![log.category] = [];
        if (!newCustomCategories[category]!.subCategories![log.category].includes(log.sub)) newCustomCategories[category]!.subCategories![log.category].push(log.sub);

        historicalTransactions.push({
            id: `hist-exp-${log.month}-${index}`, type: TransactionType.COST,
            amount: log.amount, date: randomDate(year, month - 1),
            accountId: bankAccountId, description: log.sub,
            category: category, subCategory: log.category, detail: log.sub,
        });
    });
    
    monthEndLogs.forEach(log => {
        allMonths.add(log.month);
        const [year, month] = log.month.split('-').map(Number);
        if (log.income.work > 0) historicalTransactions.push({ id: `tx-income-work-${log.month}`, type: TransactionType.INCOME, incomeType: IncomeType.WORK, amount: log.income.work, date: new Date(year, month - 1, 5).toISOString().split('T')[0], accountId: bankAccountId, description: 'Work Income' });
        if (log.income.extra > 0) historicalTransactions.push({ id: `tx-income-extra-${log.month}`, type: TransactionType.INCOME, incomeType: IncomeType.EXTRA, amount: log.income.extra, date: randomDate(year, month-1, 20, 25), accountId: bankAccountId, description: 'Extra Income' });
    });
    
    // --- 4. CALCULATE INITIAL BALANCES IF BALANCES LOG EXISTS ---
    if (accountsBalancesLog) {
      for (const typeStr in accountsBalancesLog.accounts) {
          const accountsOfType = accountsBalancesLog.accounts[typeStr];
          for (const name in accountsOfType) {
              const targetBalance = accountsOfType[name];
              const account = finalAccountsMap.get(name);
              if (account) {
                  // Temporarily set initialBalance to 0 to calculate historical transactions' impact
                  account.initialBalance = 0;
                  const historicalImpact = getAccountBalanceAtDate(account.id, new Date(), historicalTransactions, historicalInvestmentTransactions, Array.from(finalAccountsMap.values()), finalHoldings);
                  account.initialBalance = targetBalance - historicalImpact;
                  finalAccountsMap.set(name, account);
              }
          }
      }
    }
    
    const finalAccounts = Array.from(finalAccountsMap.values());

    // --- 5. RECALCULATE MONTHLY SUMMARIES ---
    const finalSummaries: MonthlySummary[] = [];
    monthEndLogs.forEach(log => allMonths.add(log.month));
    expenseLogs.forEach(log => allMonths.add(log.month));
    investmentLogs.forEach(log => allMonths.add(log.date.substring(0, 7)));
    dividendLogs.forEach(log => {
        const [, month, year] = log.date.split('/');
        allMonths.add(`${year}-${month}`);
    });

    allMonths.forEach(monthYYYYMM => {
        const [year, month] = monthYYYYMM.split('-').map(Number);
        const summary = generateMonthlySummary(month - 1, year, historicalTransactions, finalAccounts, historicalInvestmentTransactions, finalHoldings);
        
        const monthEndData = monthEndLogs.find(s => s.month === monthYYYYMM);
        if (monthEndData) {
            summary.endOfMonthCash = monthEndData.endOfMonth.cash;
            summary.endOfMonthInvestments = monthEndData.endOfMonth.investments.total;
            summary.endOfMonthInvestmentsStocks = monthEndData.endOfMonth.investments.stocksEtfs;
            summary.endOfMonthInvestmentsEtfs = 0; // Cannot split historical data, so assign all to stocks and zero to ETFs.
            summary.endOfMonthInvestmentsCrypto = monthEndData.endOfMonth.investments.crypto;
            summary.totalIncome = monthEndData.income.work + monthEndData.income.extra + historicalInvestmentTransactions
                .filter(t => t.type === 'DIVIDEND' && new Date(t.date).getUTCFullYear() === year && new Date(t.date).getUTCMonth() === (month - 1))
                .reduce((sum, t) => {
                    const holding = finalHoldings.find(h => h.id === t.holdingId);
                    return sum + convertCurrency(t.totalAmount, holding?.currency || Currency.USD, Currency.EUR);
                }, 0);
            summary.netSavings = summary.totalIncome - summary.totalSpending;
        }
        finalSummaries.push(summary);
    });

    const data = { accounts: finalAccounts, transactions: historicalTransactions, investmentHoldings: finalHoldings, investmentTransactions: historicalInvestmentTransactions };
    processAndSetLoadedData(data, newCustomCategories, finalSummaries);
}, [processAndSetLoadedData, generateMonthlySummary, convertCurrency, getAccountBalanceAtDate]);

  const getCurrencySymbol = useCallback((currency: Currency): string => {
    switch (currency) {
      case Currency.EUR: return '€';
      case Currency.USD: return '$';
      default: return '';
    }
  }, []);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: new Date().toISOString() + Math.random() };
    setTransactions(prev => [...prev, newTransaction]);
  }, [setTransactions]);
  
  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    const newAccount: Account = { ...account, id: new Date().toISOString() + Math.random() };
    setAccounts(prev => [...prev, newAccount]);
  }, [setAccounts]);

  const updateAccount = useCallback((updatedAccount: Account) => {
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  }, [setAccounts]);

  const deleteAccount = useCallback((accountId: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, [setAccounts]);

  const reorderAccounts = useCallback((reorderedAccounts: Account[]) => {
    setAccounts(reorderedAccounts);
  }, [setAccounts]);

  const updateBudget = useCallback((newBudget: Budget) => {
    setBudget(newBudget);
  }, [setBudget]);
  
  const addInvestmentHolding = useCallback((holding: Omit<InvestmentHolding, 'id'>) => {
    const newHolding: InvestmentHolding = { ...holding, id: new Date().toISOString() + Math.random() };
    setInvestmentHoldings(prev => [...prev, newHolding]);
  }, [setInvestmentHoldings]);

  const updateInvestmentHolding = useCallback((updatedHolding: InvestmentHolding) => {
    setInvestmentHoldings(prev => prev.map(h => h.id === updatedHolding.id ? updatedHolding : h));
  }, [setInvestmentHoldings]);

  const addInvestmentTransaction = useCallback((transaction: Omit<InvestmentTransaction, 'id'>) => {
      const newTransaction: InvestmentTransaction = { ...transaction, id: new Date().toISOString() + Math.random() };
      setInvestmentTransactions(prev => [...prev, newTransaction]);
  }, [setInvestmentTransactions]);

  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME && t.accountId === accountId) {
        balance += t.amount;
      } else if (t.type === TransactionType.COST && t.accountId === accountId) {
        balance -= t.amount;
      } else if (t.type === TransactionType.TRANSFER) {
        if (t.fromAccountId === accountId) {
          balance -= t.amount;
        } else if (t.toAccountId === accountId && typeof t.toAmount === 'number') {
          balance += t.toAmount;
        }
      }
    });

    investmentTransactions.forEach(t => {
        if(t.accountId === accountId) {
            const holding = investmentHoldings.find(h => h.id === t.holdingId);
            if (!holding) return; // Should not happen, but good practice

            const amountInAccountCurrency = convertCurrency(t.totalAmount, holding.currency, account.currency);

            if(t.type === InvestmentTransactionType.BUY) {
                balance -= amountInAccountCurrency;
            } else if (t.type === InvestmentTransactionType.SELL || t.type === InvestmentTransactionType.DIVIDEND) {
                balance += amountInAccountCurrency;
            }
        }
    });

    return balance;
  }, [accounts, transactions, investmentTransactions, investmentHoldings, convertCurrency]);

  const saveReport = useCallback((reportData: ReportData) => {
    setReports(prev => {
      const existingIndex = prev.findIndex(r => r.id === reportData.id);
      const newReports = [...prev];
      if (existingIndex > -1) {
        newReports[existingIndex] = reportData;
        return newReports;
      } else {
        newReports.push(reportData);
        return newReports.sort((a, b) => b.id.localeCompare(a.id));
      }
    });
  }, [setReports]);

  const addCustomDetail = useCallback((category: CostCategory, subCategory: MustSubCategory | WantsSubCategory | string, detail: string) => {
    setCustomCategories(prev => {
      const newCustomCategories = JSON.parse(JSON.stringify(prev)); // Deep copy

      if (!newCustomCategories[category]) {
        newCustomCategories[category] = {};
      }
      if (!newCustomCategories[category]!.subCategories) {
        newCustomCategories[category]!.subCategories = {};
      }
      if (!newCustomCategories[category]!.subCategories![subCategory]) {
        newCustomCategories[category]!.subCategories![subCategory] = [];
      }
      
      const details = newCustomCategories[category]!.subCategories![subCategory]!;
      if (!details.includes(detail)) {
        details.push(detail);
      }

      return newCustomCategories;
    });
  }, [setCustomCategories]);

  const addCustomSubCategory = useCallback((category: CostCategory, subCategory: string) => {
    setCustomCategories(prev => {
      const newCustomCategories = JSON.parse(JSON.stringify(prev)); // Deep copy

      if (!newCustomCategories[category]) {
        newCustomCategories[category] = {};
      }
      if (!newCustomCategories[category].newSubCategories) {
        newCustomCategories[category].newSubCategories = [];
      }
      
      const subCats = newCustomCategories[category].newSubCategories;
      if (!subCats.includes(subCategory)) {
        subCats.push(subCategory);
      }

      return newCustomCategories;
    });
  }, [setCustomCategories]);
  
  const moveFunds = useCallback((details: { fromAccountId: string, toAccountId: string, amount: number, date: string, description: string }) => {
    const { fromAccountId, toAccountId, amount, date, description } = details;
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    if (!fromAccount || !toAccount) { 
        console.error("One or both accounts not found for transfer");
        return; 
    }

    const toAmount = convertCurrency(amount, fromAccount.currency, toAccount.currency);
    
    addTransaction({
        type: TransactionType.TRANSFER,
        amount: amount,
        toAmount: toAmount,
        date: date,
        fromAccountId: fromAccountId,
        toAccountId: toAccountId,
        description: description,
    });
  }, [accounts, addTransaction, convertCurrency]);

  const importAllData = useCallback((jsonData: string) => {
    try {
        const data = JSON.parse(jsonData);

        if (typeof data !== 'object' || data === null) {
            throw new Error("Invalid data format: not an object.");
        }

        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.accounts)) setAccounts(data.accounts);
        if (typeof data.budget === 'object') setBudget(data.budget);
        if (Array.isArray(data.investmentHoldings)) setInvestmentHoldings(data.investmentHoldings);
        if (Array.isArray(data.investmentTransactions)) setInvestmentTransactions(data.investmentTransactions);
        if (typeof data.exchangeRate === 'object') setExchangeRate(data.exchangeRate);
        if (Array.isArray(data.monthlySummaries)) setMonthlySummaries(data.monthlySummaries);
        if (Array.isArray(data.reports)) setReports(data.reports);
        if (typeof data.customCategories === 'object') setCustomCategories(data.customCategories);

    } catch (e) {
        console.error("Failed to import data:", e);
        throw new Error(`Failed to import data: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [setTransactions, setAccounts, setBudget, setInvestmentHoldings, setInvestmentTransactions, setExchangeRate, setMonthlySummaries, setReports, setCustomCategories]);


  return (
    <AppContext.Provider value={{ 
      transactions, addTransaction, moveFunds,
      accounts, addAccount, updateAccount, deleteAccount, reorderAccounts,
      budget, updateBudget, 
      getAccountBalance,
      getAccountBalanceAtDate: getAccountBalanceAtDateForContext,
      investmentHoldings, addInvestmentHolding, updateInvestmentHolding,
      investmentTransactions, addInvestmentTransaction,
      exchangeRate, convertCurrency, getCurrencySymbol,
      monthlySummaries,
      reports, saveReport,
      loadTestData,
      loadAllHistoricalData,
      importAllData,
      customCategories, addCustomDetail, addCustomSubCategory
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
