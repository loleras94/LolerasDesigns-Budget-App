

import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { CostCategory, TransactionType, InvestmentTransactionType, InvestmentType, Currency } from '../types';
import { ArrowUpIcon, ArrowDownIcon, SwitchHorizontalIcon, XMarkIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const safePercentage = Math.min(100, Math.max(0, percentage));
  
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-sm font-medium text-gray-400">
            €{value.toFixed(2)} / €{max.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div className={`${color} h-2.5 rounded-full`} style={{ width: `${safePercentage}%` }}></div>
        </div>
      </div>
    );
};

const PortfolioOverview: React.FC = () => {
    const { accounts, getAccountBalance, investmentHoldings, investmentTransactions, convertCurrency } = useAppContext();
    const { t } = useLanguage();

    const { totalStocksValue, totalEtfsValue, totalCryptoValue, totalCash } = useMemo(() => {
        const holdingsMap = new Map<string, { quantity: number; currentPrice?: number; investmentType: InvestmentType; currency: Currency }>();

        investmentHoldings.forEach(h => {
            holdingsMap.set(h.id, {
                quantity: 0,
                currentPrice: h.currentPrice,
                investmentType: h.investmentType || 'Stock',
                currency: h.currency || Currency.USD,
            });
        });

        investmentTransactions.forEach(t => {
            const holding = holdingsMap.get(t.holdingId);
            if (holding) {
                if (t.type === InvestmentTransactionType.BUY) holding.quantity += t.quantity;
                if (t.type === InvestmentTransactionType.SELL) holding.quantity -= t.quantity;
            }
        });

        let stocksEUR = 0;
        let etfsEUR = 0;
        let cryptoEUR = 0;

        holdingsMap.forEach(h => {
            if (h.currentPrice && h.quantity > 0) {
                const marketValue = h.currentPrice * h.quantity;
                const marketValueEUR = convertCurrency(marketValue, h.currency, Currency.EUR);
                if (h.investmentType === 'Stock') {
                    stocksEUR += marketValueEUR;
                } else if (h.investmentType === 'ETF') {
                    etfsEUR += marketValueEUR;
                } else if (h.investmentType === 'Crypto') {
                    cryptoEUR += marketValueEUR;
                }
            }
        });

        const cashEUR = accounts.reduce((sum, a) => {
            const balance = getAccountBalance(a.id);
            return sum + convertCurrency(balance, a.currency, Currency.EUR);
        }, 0);

        return { totalStocksValue: stocksEUR, totalEtfsValue: etfsEUR, totalCryptoValue: cryptoEUR, totalCash: cashEUR };
    }, [investmentHoldings, investmentTransactions, accounts, getAccountBalance, convertCurrency]);

    const totalPortfolio = totalStocksValue + totalEtfsValue + totalCryptoValue + totalCash;

    const AssetItem: React.FC<{ label: string, value: number, color: string, percentage: number }> = ({ label, value, color, percentage }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-b-0">
            <div className="flex items-center space-x-3">
                <span className={`h-3 w-3 rounded-full ${color}`}></span>
                <span className="text-gray-300">{label}</span>
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-100">€{value.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{isNaN(percentage) ? '0.0' : percentage.toFixed(1)}%</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
                {t('dashboard.portfolioOverview')}
            </h2>
            <div className="space-y-1">
                 <AssetItem label={t('dashboard.cash')} value={totalCash} color="bg-sky-500" percentage={totalPortfolio > 0 ? (totalCash / totalPortfolio) * 100 : 0} />
                 <AssetItem label={t('investments.stocks')} value={totalStocksValue} color="bg-indigo-500" percentage={totalPortfolio > 0 ? (totalStocksValue / totalPortfolio) * 100 : 0} />
                 <AssetItem label={t('investments.etfs')} value={totalEtfsValue} color="bg-teal-500" percentage={totalPortfolio > 0 ? (totalEtfsValue / totalPortfolio) * 100 : 0} />
                 <AssetItem label={t('dashboard.crypto')} value={totalCryptoValue} color="bg-amber-500" percentage={totalPortfolio > 0 ? (totalCryptoValue / totalPortfolio) * 100 : 0} />
            </div>
             <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                <span className="font-semibold text-gray-200">{t('dashboard.totalValue')}</span>
                <span className="text-xl font-bold text-indigo-400">€{totalPortfolio.toFixed(2)}</span>
            </div>
        </div>
    );
}

const MonthlyStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="text-center px-2 h-full flex flex-col justify-end">
        <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-lg sm:text-xl font-bold ${color}`}>€{value.toFixed(2)}</p>
    </div>
);


const Dashboard: React.FC = () => {
    const { transactions, budget, accounts, convertCurrency, getCurrencySymbol, reports } = useAppContext();
    const { t, locale } = useLanguage();

    const [showReportPrompt, setShowReportPrompt] = useState(false);
    const [lastMonthName, setLastMonthName] = useState('');

    useEffect(() => {
        const today = new Date();
        const isEarlyInMonth = today.getDate() <= 3; // Show prompt for the first 3 days of the month

        if (isEarlyInMonth) {
            const lastMonthDate = new Date(today);
            lastMonthDate.setDate(0); // Sets to last day of previous month
            const lastMonthYear = lastMonthDate.getFullYear();
            const lastMonth = lastMonthDate.getMonth(); // 0-11

            setLastMonthName(t(`months.${lastMonth}`));

            const reportId = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`;
            const reportExists = reports.find(r => r.id === reportId);

            if (!reportExists) {
                setShowReportPrompt(true);
            }
        }
    }, [reports, t]);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const getAccountCurrency = (accountId: string): Currency => {
        return accounts.find(a => a.id === accountId)?.currency || Currency.EUR;
    };

    const mustSpending = monthlyTransactions
        .filter(t => t.category === CostCategory.MUST)
        .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);

    const wantsSpending = monthlyTransactions
        .filter(t => t.category === CostCategory.WANTS)
        .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);
        
    const totalIncome = monthlyTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + convertCurrency(t.amount, getAccountCurrency(t.accountId!), Currency.EUR), 0);

    const totalSpending = mustSpending + wantsSpending;
    const savings = totalIncome - totalSpending;
    
    // Budget goals are in EUR
    const mustBudget = budget.monthlyIncome * (budget.mustPercentage / 100);
    const wantsBudget = budget.monthlyIncome * (budget.wantsPercentage / 100);
    const savingsGoal = budget.monthlyIncome * (budget.savingsPercentage / 100);

    const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';
    
    return (
        <div className="space-y-6">
            {showReportPrompt && (
                <div className="bg-indigo-800/50 border border-indigo-600 text-indigo-200 px-4 py-3 rounded-lg relative flex items-start space-x-3" role="alert">
                    <div className="flex-shrink-0">
                        <span className="font-bold text-indigo-300">{t('dashboard.newMonthPromptTitle')}</span>
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm">{t('dashboard.newMonthPromptBody', { monthName: lastMonthName })}</p>
                    </div>
                    <div className="flex-shrink-0">
                        <button onClick={() => setShowReportPrompt(false)} className=" text-indigo-300 hover:text-indigo-100">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-3 divide-x divide-gray-600/50">
                    <MonthlyStat label={t('dashboard.monthlyIncome')} value={totalIncome} color="text-green-400" />
                    <MonthlyStat label={t('dashboard.monthlySpent')} value={totalSpending} color="text-red-400" />
                    <MonthlyStat label={t('dashboard.netSavings')} value={savings} color="text-blue-400" />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-lg font-semibold text-gray-200 mb-2">{t('dashboard.budgetProgress')}</h2>
                <ProgressBar value={mustSpending} max={mustBudget} color="bg-orange-500" label={t('dashboard.musts')} />
                <ProgressBar value={wantsSpending} max={wantsBudget} color="bg-sky-500" label={t('dashboard.wants')} />
                <ProgressBar value={savings} max={savingsGoal} color="bg-emerald-500" label={t('dashboard.savings')} />
            </div>

            <PortfolioOverview />

            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">{t('dashboard.recentTransactions')}</h2>
                <ul className="space-y-3">
                    {recentTransactions.length > 0 ? recentTransactions.map(t => {
                        if (t.type === TransactionType.TRANSFER) {
                             return (
                                <li key={t.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-full bg-blue-500/20">
                                            <SwitchHorizontalIcon className="text-blue-400 h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-100">{t.description}</p>
                                            <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString(locale)}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-gray-100">
                                        {getCurrencySymbol(getAccountCurrency(t.fromAccountId!))}{t.amount.toFixed(2)}
                                    </span>
                                </li>
                             );
                        }
                        return (
                            <li key={t.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${t.type === TransactionType.INCOME ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                        {t.type === TransactionType.INCOME ? <ArrowUpIcon className="text-green-400"/> : <ArrowDownIcon className="text-red-400"/>}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-100">{t.description}</p>
                                        <p className="text-xs text-gray-400">{getAccountName(t.accountId!)} &middot; {new Date(t.date).toLocaleDateString(locale)}</p>
                                    </div>
                                </div>
                                <span className={`font-semibold ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type === TransactionType.INCOME ? '+' : '-'}{getCurrencySymbol(getAccountCurrency(t.accountId!))}{t.amount.toFixed(2)}
                                </span>
                            </li>
                        );
                    }) : <p className="text-gray-400 text-center py-4">{t('dashboard.noTransactions')}</p>}
                </ul>
            </div>
        </div>
    );
};

export default Dashboard;