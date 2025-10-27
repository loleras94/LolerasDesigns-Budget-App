import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Transaction, InvestmentTransaction, TransactionType, CostCategory, InvestmentTransactionType, Currency, InvestmentType, ReportData } from '../types';
import MonthlyReport from './MonthlyReport';
import { GoogleGenAI } from "@google/genai";
import { SpinnerIcon, ArrowDownIcon, ArrowUpIcon, SwitchHorizontalIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

type DisplayTransaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    isPositive: boolean;
    currencySymbol: string;
    accountName: string;
    details: string;
    Icon: React.FC<React.SVGProps<SVGSVGElement>>;
    color: string;
};

const TransactionRow: React.FC<{ transaction: DisplayTransaction }> = ({ transaction }) => {
    const { locale } = useLanguage();
    const { Icon, color, isPositive, currencySymbol, amount, description, date, details, accountName } = transaction;

    return (
        <li className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${color.replace('text-', 'bg-').replace('400', '500/20')}`}>
                    <Icon className={`${color} h-5 w-5`} />
                </div>
                <div>
                    <p className="font-medium text-gray-100">{description}</p>
                    <p className="text-xs text-gray-400">{accountName} &middot; {new Date(date).toLocaleDateString(locale)}</p>
                    <p className="text-xs text-gray-500">{details}</p>
                </div>
            </div>
            <span className={`font-semibold ${color}`}>
                {isPositive ? '+' : '-'}{currencySymbol}{amount.toFixed(2)}
            </span>
        </li>
    );
};


const History: React.FC = () => {
    const { transactions, accounts, investmentTransactions, investmentHoldings, convertCurrency, reports, saveReport, getCurrencySymbol, monthlySummaries } = useAppContext();
    const { t } = useLanguage();

    const [activeView, setActiveView] = useState<'reports' | 'transactions'>('reports');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        transactions.forEach(t => years.add(new Date(t.date).getUTCFullYear()));
        investmentTransactions.forEach(t => years.add(new Date(t.date).getUTCFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions, investmentTransactions]);

    const availableMonths = useMemo(() => {
        if (!selectedYear) return [];
        const year = parseInt(selectedYear);
        const months = new Set<number>();
        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getUTCFullYear() === year) months.add(d.getUTCMonth());
        });
        investmentTransactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getUTCFullYear() === year) months.add(d.getUTCMonth());
        });

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let monthArray = Array.from(months);
        
        if (activeView === 'reports' && year === currentYear) {
            monthArray = monthArray.filter(m => m < currentMonth);
        }

        return monthArray.sort((a, b) => a - b);
    }, [selectedYear, transactions, investmentTransactions, activeView]);

    useEffect(() => {
        if (availableYears.length > 0 && !selectedYear) {
            setSelectedYear(String(availableYears[0]));
        }
    }, [availableYears, selectedYear]);
    
    useEffect(() => {
        if (!selectedYear) return;
    
        if (availableMonths.length > 0) {
            const latestMonth = String(availableMonths[availableMonths.length - 1]);
            setSelectedMonth(latestMonth);
        } else {
            setSelectedMonth('');
        }
        setReportData(null);
        setError(null);
    }, [selectedYear, availableMonths]);

    useEffect(() => {
        if (activeView === 'reports' && selectedYear && selectedMonth) {
            const reportId = `${selectedYear}-${String(parseInt(selectedMonth) + 1).padStart(2, '0')}`;
            const existingReport = reports.find(r => r.id === reportId);
            setReportData(existingReport || null);
            setError(null);
        } else {
            setReportData(null);
        }
    }, [activeView, selectedYear, selectedMonth, reports]);

    // FIX: Renamed map/filter variable from `t` to `transaction` to avoid shadowing the translation function `t`.
    const combinedTransactions = useMemo((): DisplayTransaction[] => {
        if (!selectedYear || !selectedMonth) return [];

        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);

        const getAccount = (id?: string) => accounts.find(a => a.id === id);

        const filteredTransactions = transactions
            .filter(transaction => { const d = new Date(transaction.date); return d.getUTCFullYear() === year && d.getUTCMonth() === month; })
            .map((transaction): DisplayTransaction => {
                const account = getAccount(transaction.accountId || transaction.fromAccountId);
                const currencySymbol = account ? getCurrencySymbol(account.currency) : '€';
                
                if (transaction.type === TransactionType.TRANSFER) {
                    const toAccount = getAccount(transaction.toAccountId);
                    return {
                        id: transaction.id, date: transaction.date, description: transaction.description, amount: transaction.amount,
                        isPositive: false, // Neutral, but display style needs a boolean
                        currencySymbol: currencySymbol, accountName: account?.name || 'N/A',
                        details: `To: ${toAccount?.name || 'N/A'}`,
                        Icon: SwitchHorizontalIcon, color: 'text-blue-400'
                    }
                }
                 if (transaction.type === TransactionType.INCOME) {
                    return {
                        id: transaction.id, date: transaction.date, description: transaction.description, amount: transaction.amount, isPositive: true,
                        currencySymbol: currencySymbol, accountName: account?.name || 'N/A', details: transaction.incomeType || '',
                        Icon: ArrowUpIcon, color: 'text-green-400'
                    }
                }
                // COST
                return {
                    id: transaction.id, date: transaction.date, description: transaction.description, amount: transaction.amount, isPositive: false,
                    currencySymbol: currencySymbol, accountName: account?.name || 'N/A', details: `${transaction.category} > ${transaction.subCategory}`,
                    Icon: ArrowDownIcon, color: 'text-red-400'
                }
            });

        const filteredInvestmentTransactions = investmentTransactions
            .filter(transaction => { const d = new Date(transaction.date); return d.getUTCFullYear() === year && d.getUTCMonth() === month; })
            .map((transaction): DisplayTransaction | null => {
                const account = getAccount(transaction.accountId);
                const holding = investmentHoldings.find(h => h.id === transaction.holdingId);
                if (!account || !holding) return null;

                const currencySymbol = getCurrencySymbol(account.currency);
                const isPositive = transaction.type === InvestmentTransactionType.SELL || transaction.type === InvestmentTransactionType.DIVIDEND;

                return {
                    id: transaction.id, date: transaction.date, amount: transaction.totalAmount, isPositive, currencySymbol,
                    accountName: account.name,
                    description: `${t(`investmentTransactionTypes.${transaction.type}`)} ${holding.ticker}`,
                    details: transaction.type !== 'DIVIDEND' ? `${transaction.quantity.toFixed(4)} @ ${transaction.pricePerUnit.toFixed(2)}` : 'Dividend Income',
                    Icon: isPositive ? ArrowUpIcon : ArrowDownIcon,
                    color: transaction.type === 'BUY' ? 'text-red-400' : 'text-green-400'
                }
            }).filter((transaction): transaction is DisplayTransaction => transaction !== null);

        return [...filteredTransactions, ...filteredInvestmentTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [selectedYear, selectedMonth, transactions, investmentTransactions, accounts, investmentHoldings, getCurrencySymbol, t]);


    const getMonthName = (monthIndex: number): string => {
        return t(`months.${monthIndex}`);
    };

    const handleGenerateReport = async () => {
        if (!selectedYear || !selectedMonth) {
            setReportData(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const year = parseInt(selectedYear);
            const month = parseInt(selectedMonth);
            const reportId = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            // --- Date Setup ---
            const portfolioStartDate = new Date(Date.UTC(year, month, 0)); // Last day of previous month
            const portfolioEndDate = new Date(Date.UTC(year, month + 1, 0)); // Last day of selected month
            
            const startDateString = portfolioStartDate.toISOString().split('T')[0];
            const endDateString = portfolioEndDate.toISOString().split('T')[0];

            // --- Fetch Historical Prices ---
            const allTickers = [...new Set(investmentHoldings.map(h => h.ticker.toUpperCase()))];
            const historicalPrices: Record<string, Record<string, number>> = {
                [startDateString]: {},
                [endDateString]: {}
            };

            if (allTickers.length > 0) {
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const prompt = `Use Google Search to find the historical closing prices for these tickers on two specific dates: ${startDateString} and ${endDateString}. Tickers: ${allTickers.join(', ')}.
Respond with ONLY a valid JSON array of objects. Each object must have "ticker" (string, uppercase), "date" (string, YYYY-MM-DD), and "price" (number).
- For stocks/ETFs, find the price in their primary trading currency.
- For cryptocurrencies, find the price in USD.
- If a date is a non-trading day, use the closing price of the last trading day before it.
- If you cannot find a price, omit that specific ticker-date entry from the array.
- If no prices can be found at all, return an empty array [].
Example response: [{"ticker": "AAPL", "date": "${startDateString}", "price": 170.33}, {"ticker": "BTC", "date": "${endDateString}", "price": 67493.43}]`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: { tools: [{googleSearch: {}}] },
                });

                let responseText = response.text;
                const jsonMatch = responseText.match(/```(json)?([\s\S]*?)```/);
                if (jsonMatch && jsonMatch[2]) {
                    responseText = jsonMatch[2].trim();
                }
                try {
                    const priceData = JSON.parse(responseText);

                    if (Array.isArray(priceData)) {
                        priceData.forEach((item: any) => {
                            if (item.date && item.ticker && typeof item.price === 'number') {
                                if (item.date === startDateString || item.date === endDateString) {
                                     if (!historicalPrices[item.date]) {
                                        historicalPrices[item.date] = {};
                                    }
                                    historicalPrices[item.date][item.ticker.toUpperCase()] = item.price;
                                }
                            }
                        });
                    } else {
                        console.warn("API response was valid JSON but not an array:", priceData);
                    }
                } catch (parseError) {
                    console.error("Failed to parse JSON from API response:", responseText);
                    throw new Error("API returned a non-JSON response or invalid data.");
                }
            }

            // --- Calculation Helpers ---
            const getPortfolioValueAtDate = (evalDate: Date, types?: InvestmentType[]): number => {
                let totalValueEUR = 0;
                const evalDateString = evalDate.toISOString().split('T')[0];
                const pricesForDate = historicalPrices[evalDateString] || {};
    
                const relevantHoldings = types 
                    ? investmentHoldings.filter(h => types.includes(h.investmentType)) 
                    : investmentHoldings;
    
                relevantHoldings.forEach(holding => {
                    const transactionsUpToDate = investmentTransactions.filter(t => t.holdingId === holding.id && new Date(t.date) <= evalDate);
                    if (transactionsUpToDate.length === 0) return;
    
                    const quantityAtDate = transactionsUpToDate.reduce((sum, t) => {
                        if (t.type === InvestmentTransactionType.BUY) return sum + t.quantity;
                        if (t.type === InvestmentTransactionType.SELL) return sum - t.quantity;
                        return sum;
                    }, 0);
                    if (quantityAtDate <= 0) return;
    
                    let price = pricesForDate[holding.ticker.toUpperCase()];
                    // Fallback if AI fails to find a price
                    if (price === undefined) {
                        const lastPricedTransaction = [...transactionsUpToDate].filter(t => t.type === 'BUY' || t.type === 'SELL').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        price = lastPricedTransaction ? lastPricedTransaction.pricePerUnit : holding.currentPrice || 0;
                    }
                    
                    const marketValue = quantityAtDate * price;
                    totalValueEUR += convertCurrency(marketValue, holding.currency, Currency.EUR);
                });
                return totalValueEUR;
            };

            const reportStartDate = new Date(Date.UTC(year, month, 1));
            const reportEndDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

            const getAccountCurrency = (accountId: string): Currency => accounts.find(a => a.id === accountId)?.currency || Currency.EUR;

            const monthTransactions = transactions.filter(t => { const d = new Date(t.date); return d >= reportStartDate && d <= reportEndDate; });
            const monthInvestmentTransactions = investmentTransactions.filter(t => { const d = new Date(t.date); return d >= reportStartDate && d <= reportEndDate; });

            // --- Report Data Calculations ---
            const workIncome = monthTransactions.filter(t => t.incomeType === 'Work').reduce((s, t) => s + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
            const extraIncome = monthTransactions.filter(t => t.incomeType === 'Extra');
            const dividends = monthInvestmentTransactions.filter(t => t.type === InvestmentTransactionType.DIVIDEND);
            const totalIncome = workIncome + extraIncome.reduce((s, t) => s + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0) + dividends.reduce((s, t) => s + convertCurrency(t.totalAmount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
            
            const mustSpending = monthTransactions.filter(t => t.category === CostCategory.MUST).reduce((s, t) => s + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
            const wantsSpending = monthTransactions.filter(t => t.category === CostCategory.WANTS).reduce((s, t) => s + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
            const totalSpending = mustSpending + wantsSpending;
            
            const buys = monthInvestmentTransactions.filter(t => t.type === InvestmentTransactionType.BUY);
            const sells = monthInvestmentTransactions.filter(t => t.type === InvestmentTransactionType.SELL);
            const totalBuys = buys.reduce((s, t) => s + convertCurrency(t.totalAmount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
            const totalSells = sells.reduce((s, t) => s + convertCurrency(t.totalAmount, getAccountCurrency(t.accountId!), Currency.EUR), 0);

            const netSavings = totalIncome - totalSpending;
            const netInvestments = totalBuys - totalSells;
            const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
            const investmentRate = totalIncome > 0 ? (netInvestments / totalIncome) * 100 : 0;
            const cashFlow = totalIncome - totalSpending - netInvestments;

            const bySubCategory: { [key: string]: { total: number, category: CostCategory } } = {};
            monthTransactions.filter(t => t.type === TransactionType.COST && t.subCategory && t.category).forEach(t => {
                const subCat = t.subCategory!;
                if (!bySubCategory[subCat]) bySubCategory[subCat] = { total: 0, category: t.category! };
                bySubCategory[subCat].total += convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR);
            });

            const allTransactionsUpToMonthEnd = transactions.filter(t => new Date(t.date) <= reportEndDate);
            const allInvestmentTransactionsUpToMonthEnd = investmentTransactions.filter(t => new Date(t.date) <= reportEndDate);
            
            const endOfMonthCash = accounts.reduce((sum, acc) => {
                let balance = acc.initialBalance;
                allTransactionsUpToMonthEnd.filter(t => t.accountId === acc.id).forEach(t => { balance += t.type === TransactionType.INCOME ? t.amount : -t.amount; });
                allInvestmentTransactionsUpToMonthEnd.filter(t => t.accountId === acc.id).forEach(t => {
                    if (t.type === InvestmentTransactionType.BUY) balance -= t.totalAmount;
                    else balance += t.totalAmount;
                });
                return sum + convertCurrency(balance, acc.currency, Currency.EUR);
            }, 0);

            const existingSummary = monthlySummaries.find(s => s.id === reportId);
            const prevMonthDate = new Date(year, month, 0);
            const prevReportId = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const prevSummary = monthlySummaries.find(s => s.id === prevReportId);

            const endValueTotal = (existingSummary?.endOfMonthInvestments !== undefined) ? existingSummary.endOfMonthInvestments : getPortfolioValueAtDate(portfolioEndDate);
            const startValueTotal = (prevSummary?.endOfMonthInvestments !== undefined) ? prevSummary.endOfMonthInvestments : getPortfolioValueAtDate(portfolioStartDate);
            const endValueStocks = (existingSummary?.endOfMonthInvestmentsStocks !== undefined) ? existingSummary.endOfMonthInvestmentsStocks : getPortfolioValueAtDate(portfolioEndDate, ['Stock']);
            const startValueStocks = (prevSummary?.endOfMonthInvestmentsStocks !== undefined) ? prevSummary.endOfMonthInvestmentsStocks : getPortfolioValueAtDate(portfolioStartDate, ['Stock']);
            const endValueEtfs = (existingSummary?.endOfMonthInvestmentsEtfs !== undefined) ? existingSummary.endOfMonthInvestmentsEtfs : getPortfolioValueAtDate(portfolioEndDate, ['ETF']);
            const startValueEtfs = (prevSummary?.endOfMonthInvestmentsEtfs !== undefined) ? prevSummary.endOfMonthInvestmentsEtfs : getPortfolioValueAtDate(portfolioStartDate, ['ETF']);
            const endValueCrypto = (existingSummary?.endOfMonthInvestmentsCrypto !== undefined) ? existingSummary.endOfMonthInvestmentsCrypto : getPortfolioValueAtDate(portfolioEndDate, ['Crypto']);
            const startValueCrypto = (prevSummary?.endOfMonthInvestmentsCrypto !== undefined) ? prevSummary.endOfMonthInvestmentsCrypto : getPortfolioValueAtDate(portfolioStartDate, ['Crypto']);
            const endOfMonthInvestments = endValueTotal;


            const getNetInflowsForTypes = (types?: InvestmentType[]) => {
                const ids = types ? investmentHoldings.filter(h => types.includes(h.investmentType)).map(h => h.id) : investmentHoldings.map(h => h.id);
                const buysAmt = monthInvestmentTransactions.filter(t => t.type === 'BUY' && ids.includes(t.holdingId)).reduce((s, t) => s + convertCurrency(t.totalAmount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
                const sellsAmt = monthInvestmentTransactions.filter(t => t.type === 'SELL' && ids.includes(t.holdingId)).reduce((s, t) => s + convertCurrency(t.totalAmount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
                return buysAmt - sellsAmt;
            };

            const netInflowsTotal = getNetInflowsForTypes();
            const netInflowsStocks = getNetInflowsForTypes(['Stock']);
            const netInflowsEtfs = getNetInflowsForTypes(['ETF']);
            const netInflowsCrypto = getNetInflowsForTypes(['Crypto']);

            const calculatePerformance = (end: number, start: number, inflows: number) => {
                const gain = end - start - inflows;
                const denominator = start + (inflows / 2); // More accurate for intra-month flows
                return denominator !== 0 ? (gain / denominator) * 100 : 0;
            };
            
            const performanceTotal = calculatePerformance(endValueTotal, startValueTotal, netInflowsTotal);
            const performanceStocks = calculatePerformance(endValueStocks, startValueStocks, netInflowsStocks);
            const performanceEtfs = calculatePerformance(endValueEtfs, startValueEtfs, netInflowsEtfs);
            const performanceCrypto = calculatePerformance(endValueCrypto, startValueCrypto, netInflowsCrypto);
           
            const newReportData: ReportData = {
                id: reportId,
                year, month,
                summary: { totalIncome, totalSpending, netSavings, netInvestments, savingsRate, investmentRate, cashFlow, endOfMonthCash, endOfMonthInvestments },
                incomeDetails: { workIncome, extraIncome, dividends },
                expenseDetails: { mustSpending, wantsSpending, transactions: monthTransactions.filter(t => t.type === TransactionType.COST), bySubCategory },
                investmentDetails: { buys, sells, performance: { total: performanceTotal, stocks: performanceStocks, etfs: performanceEtfs, crypto: performanceCrypto }, startValue: startValueTotal, endValue: endValueTotal, netInflows: netInflowsTotal }
            };

            saveReport(newReportData);

        } catch (e) {
            console.error("Failed to generate report:", e);
            setError(t('history.errorMessage'));
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-center text-gray-100">{t('history.title')}</h2>

            <div className="flex bg-gray-700 p-1 rounded-lg">
                <button type="button" onClick={() => setActiveView('reports')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${activeView === 'reports' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>{t('history.monthlyReports')}</button>
                <button type="button" onClick={() => setActiveView('transactions')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${activeView === 'transactions' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>{t('history.transactionHistory')}</button>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2">
                    <label htmlFor="year-select" className="text-sm font-medium text-gray-300 mb-1 block">{t('history.year')}</label>
                    <select id="year-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputClasses}>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="w-full sm:w-1/2">
                     <label htmlFor="month-select" className="text-sm font-medium text-gray-300 mb-1 block">{t('history.month')}</label>
                    <select id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputClasses} disabled={!selectedYear}>
                        {availableMonths.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                    </select>
                </div>
                {activeView === 'reports' && (
                    <div className="w-full sm:w-auto sm:pt-6">
                        <button onClick={handleGenerateReport} disabled={!selectedYear || !selectedMonth || isLoading} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                            {isLoading && <SpinnerIcon className="animate-spin h-5 w-5" />}
                            <span>{isLoading ? t('history.generating') : (reportData ? t('history.refreshReport') : t('history.generateReport'))}</span>
                        </button>
                    </div>
                )}
            </div>

            {activeView === 'reports' && (
                <>
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-center">
                            <p className="font-bold text-red-300">{t('history.errorTitle')}</p>
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {reportData ? (
                        <MonthlyReport data={reportData} />
                    ) : !isLoading && (
                        <div className="bg-gray-800 text-center p-8 rounded-lg">
                            <p className="text-gray-400">{t('history.prompt')}</p>
                        </div>
                    )}
                </>
            )}

            {activeView === 'transactions' && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h4 className="text-lg font-semibold text-gray-200 mb-4">
                      {selectedYear && selectedMonth ? t('history.transactionsFor', { month: getMonthName(parseInt(selectedMonth)), year: selectedYear}) : ''}
                    </h4>
                    {combinedTransactions.length > 0 ? (
                         <ul className="space-y-3">
                           {combinedTransactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                         </ul>
                    ) : (
                         <p className="text-gray-400 text-center py-4">{t('history.noTransactionsForPeriod')}</p>
                    )}
                </div>
            )}

        </div>
    );
};

export default History;