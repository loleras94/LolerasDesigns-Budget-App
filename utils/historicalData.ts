import { Account, Transaction, InvestmentHolding, InvestmentTransaction, Currency, TransactionType, CostCategory, IncomeType, InvestmentTransactionType, InvestmentType } from '../types';

// Helper to get a random date within a specific month and year
const randomDate = (year: number, month: number, startDay = 1, endDay = 28): string => {
  const start = new Date(year, month, startDay);
  const end = new Date(year, month, endDay);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

export const generateHistoricalData = () => {
    const historicalAccounts: Account[] = [
        { id: 'hist-acc-eur-1', name: 'Legacy Bank (EUR)', type: 'Bank', initialBalance: 8000, currency: Currency.EUR },
        { id: 'hist-acc-eur-2', name: 'Legacy Brokerage (EUR)', type: 'Brokerage', initialBalance: 15000, currency: Currency.EUR },
    ];

    const historicalHoldings: InvestmentHolding[] = [
        { id: 'h-vusa-1', name: 'Vanguard S&P 500 UCITS ETF', ticker: 'VUSA', investmentType: 'ETF', currency: Currency.EUR, currentPrice: 95.50 },
        { id: 'h-prop-1', name: 'iShares Dev Property UCITS ETF', ticker: 'IWDP', investmentType: 'ETF', currency: Currency.EUR, currentPrice: 25.10 },
    ];

    let historicalTransactions: Transaction[] = [];
    let historicalInvestmentTransactions: InvestmentTransaction[] = [];

    const startDate = new Date(2023, 5, 1); // June 2023
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() - 4); // End 4 months ago to not overlap with test data

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

        // --- Regular Transactions ---
        // Income
        historicalTransactions.push({ id: `tx-income-${monthStr}`, type: TransactionType.INCOME, incomeType: IncomeType.WORK, amount: 3200, date: randomDate(year, month, 1, 5), accountId: 'hist-acc-eur-1', description: 'Work Income' });

        // Musts
        historicalTransactions.push({ id: `tx-must-rent-${monthStr}`, type: TransactionType.COST, amount: 850, date: new Date(year, month, 2).toISOString().split('T')[0], accountId: 'hist-acc-eur-1', description: 'RENT', category: CostCategory.MUST, subCategory: 'HOME', detail: 'RENT' });
        for(let d = 0; d < 5; d++) {
            historicalTransactions.push({ id: `tx-must-food-${monthStr}-${d}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 80 + 20).toFixed(2)), date: randomDate(year, month), accountId: 'hist-acc-eur-1', description: 'SUPERMARKET', category: CostCategory.MUST, subCategory: 'HOME', detail: 'SUPERMARKET' });
        }
        historicalTransactions.push({ id: `tx-must-gas-${monthStr}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 40 + 30).toFixed(2)), date: randomDate(year, month), accountId: 'hist-acc-eur-1', description: 'GAS', category: CostCategory.MUST, subCategory: 'MOVEMENT', detail: 'GAS' });

        // Wants
        for(let d = 0; d < 4; d++) {
            historicalTransactions.push({ id: `tx-wants-fun-${monthStr}-${d}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 50 + 15).toFixed(2)), date: randomDate(year, month), accountId: 'hist-acc-eur-1', description: 'FOOD', category: CostCategory.WANTS, subCategory: 'FUN', detail: 'FOOD' });
        }
        historicalTransactions.push({ id: `tx-wants-shop-${monthStr}`, type: TransactionType.COST, amount: parseFloat((Math.random() * 100 + 40).toFixed(2)), date: randomDate(year, month), accountId: 'hist-acc-eur-1', description: 'HAIRCUT', category: CostCategory.WANTS, subCategory: 'SHOPPING', detail: 'HAIRCUT' });
        
        // --- Investment Transactions ---
        const investmentAmount = 450;
        const investmentDate = randomDate(year, month, 14, 16);
        // 1. Transfer funds to brokerage
        historicalTransactions.push({
            id: `tx-transfer-${monthStr}`,
            type: TransactionType.TRANSFER,
            amount: investmentAmount,
            toAmount: investmentAmount,
            date: investmentDate,
            fromAccountId: 'hist-acc-eur-1',
            toAccountId: 'hist-acc-eur-2',
            description: 'Monthly Investment Transfer',
        });
        
        // 2. Buy ETFs (prices are invented and slightly increase over time for realism)
        const vusaPrice = 75 + (year - 2023) * 12 + month;
        const propPrice = 22 + (year - 2023) * 2 + month * 0.2;
        const vusaAmount = 300;
        const propAmount = 150;
        const vusaQty = vusaAmount / vusaPrice;
        const propQty = propAmount / propPrice;

        historicalInvestmentTransactions.push({
            id: `inv-vusa-${monthStr}`, holdingId: 'h-vusa-1', type: InvestmentTransactionType.BUY,
            date: investmentDate, quantity: vusaQty, pricePerUnit: vusaPrice, totalAmount: vusaAmount,
            accountId: 'hist-acc-eur-2'
        });
        historicalInvestmentTransactions.push({
            id: `inv-prop-${monthStr}`, holdingId: 'h-prop-1', type: InvestmentTransactionType.BUY,
            date: investmentDate, quantity: propQty, pricePerUnit: propPrice, totalAmount: propAmount,
            accountId: 'hist-acc-eur-2'
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
        accounts: historicalAccounts,
        transactions: historicalTransactions,
        investmentHoldings: historicalHoldings,
        investmentTransactions: historicalInvestmentTransactions,
    };
};
