import { Account, Transaction, InvestmentHolding, InvestmentTransaction, Currency, TransactionType, CostCategory, IncomeType, InvestmentTransactionType, InvestmentType, AccountType } from '../types';
import { CATEGORIES } from '../constants';

// Helper to get a random date within a specific month and year
const randomDate = (year: number, month: number): string => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

// Helper to get a random item from an array
const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateTestData = () => {
    const now = new Date();
    const testAccounts: Account[] = [
        { id: 'acc-eur-1', name: 'Main Bank (EUR)', type: 'Bank', initialBalance: 5000, currency: Currency.EUR },
        { id: 'acc-usd-1', name: 'Brokerage (USD)', type: 'Brokerage', initialBalance: 10000, currency: Currency.USD },
    ];

    const testHoldings: InvestmentHolding[] = [
        { id: 'h-aapl-1', name: 'Apple Inc.', ticker: 'AAPL', investmentType: 'Stock', currency: Currency.USD, currentPrice: 175.50 },
        { id: 'h-btc-1', name: 'Bitcoin', ticker: 'BTC', investmentType: 'Crypto', currency: Currency.USD, currentPrice: 68000.00 },
    ];

    let testTransactions: Transaction[] = [];
    let testInvestmentTransactions: InvestmentTransaction[] = [];

    for (let i = 3; i > 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // --- Regular Transactions ---
        // Income
        testTransactions.push({ id: `tx-income-${i}`, type: TransactionType.INCOME, incomeType: IncomeType.WORK, amount: 3200, date: randomDate(year, month), accountId: 'acc-eur-1', description: 'Work Income' });

        // Musts
        testTransactions.push({ id: `tx-must-rent-${i}`, type: TransactionType.COST, amount: 850, date: new Date(year, month, 2).toISOString().split('T')[0], accountId: 'acc-eur-1', description: 'RENT', category: CostCategory.MUST, subCategory: 'HOME', detail: 'RENT' });
        for(let d = 0; d < 5; d++) {
            testTransactions.push({ id: `tx-must-food-${i}-${d}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 80 + 20).toFixed(2)), date: randomDate(year, month), accountId: 'acc-eur-1', description: 'SUPERMARKET', category: CostCategory.MUST, subCategory: 'HOME', detail: 'SUPERMARKET' });
        }
        testTransactions.push({ id: `tx-must-gas-${i}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 40 + 30).toFixed(2)), date: randomDate(year, month), accountId: 'acc-eur-1', description: 'GAS', category: CostCategory.MUST, subCategory: 'MOVEMENT', detail: 'GAS' });

        // Wants
        for(let d = 0; d < 4; d++) {
            testTransactions.push({ id: `tx-wants-fun-${i}-${d}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 50 + 15).toFixed(2)), date: randomDate(year, month), accountId: 'acc-eur-1', description: 'FOOD', category: CostCategory.WANTS, subCategory: 'FUN', detail: 'FOOD' });
        }
        testTransactions.push({ id: `tx-wants-shop-${i}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 100 + 40).toFixed(2)), date: randomDate(year, month), accountId: 'acc-eur-1', description: 'HAIRCUT', category: CostCategory.WANTS, subCategory: 'SHOPPING', detail: 'HAIRCUT' });
    }

    // --- Investment Transactions ---
    const month3Ago = new Date(now.getFullYear(), now.getMonth() - 3, 15);
    const month2Ago = new Date(now.getFullYear(), now.getMonth() - 2, 15);
    const month1Ago = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // 3 months ago: Buy AAPL and BTC
    testInvestmentTransactions.push({ id: 'inv-1', holdingId: 'h-aapl-1', type: InvestmentTransactionType.BUY, date: randomDate(month3Ago.getFullYear(), month3Ago.getMonth()), quantity: 10, pricePerUnit: 170.12, totalAmount: 1701.20, accountId: 'acc-usd-1' });
    testInvestmentTransactions.push({ id: 'inv-2', holdingId: 'h-btc-1', type: InvestmentTransactionType.BUY, date: randomDate(month3Ago.getFullYear(), month3Ago.getMonth()), quantity: 0.05, pricePerUnit: 65000.00, totalAmount: 3250.00, accountId: 'acc-usd-1' });
    
    // 2 months ago: Buy more AAPL, sell some BTC
    testInvestmentTransactions.push({ id: 'inv-3', holdingId: 'h-aapl-1', type: InvestmentTransactionType.BUY, date: randomDate(month2Ago.getFullYear(), month2Ago.getMonth()), quantity: 5, pricePerUnit: 172.50, totalAmount: 862.50, accountId: 'acc-usd-1' });
    testInvestmentTransactions.push({ id: 'inv-4', holdingId: 'h-btc-1', type: InvestmentTransactionType.SELL, date: randomDate(month2Ago.getFullYear(), month2Ago.getMonth()), quantity: 0.02, pricePerUnit: 68500.00, totalAmount: 1370.00, accountId: 'acc-usd-1' });

    // 1 month ago: Get Dividend from AAPL
    testInvestmentTransactions.push({ id: 'inv-5', holdingId: 'h-aapl-1', type: InvestmentTransactionType.DIVIDEND, date: randomDate(month1Ago.getFullYear(), month1Ago.getMonth()), quantity: 0, pricePerUnit: 0, totalAmount: 15 * 0.24, accountId: 'acc-usd-1' });

    return {
        accounts: testAccounts,
        transactions: testTransactions,
        investmentHoldings: testHoldings,
        investmentTransactions: testInvestmentTransactions,
    };
};
