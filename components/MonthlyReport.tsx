
import React from 'react';
import { ReportData } from '../types';
import { useAppContext } from '../context/AppContext';
import { CostCategory } from '../types';
import { useLanguage } from '../context/LanguageContext';

const StatCard: React.FC<{ title: string; amount: number; color?: string }> = ({ title, amount, color = 'text-indigo-400' }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg shadow-md text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-semibold ${color}`}>€{amount.toFixed(2)}</p>
    </div>
);

const PercentageStatCard: React.FC<{ title: string; percentage: number; color?: string }> = ({ title, percentage, color = 'text-indigo-400' }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg shadow-md text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-semibold ${color}`}>{percentage.toFixed(1)}%</p>
    </div>
);

const PerformanceStat: React.FC<{ title: string; percentage: number }> = ({ title, percentage }) => {
    const color = percentage > 0 ? 'text-green-400' : percentage < 0 ? 'text-red-400' : 'text-gray-300';
    const sign = percentage > 0 ? '+' : '';
    return (
        <div className="bg-gray-700/50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-xl font-bold ${color}`}>{sign}{percentage.toFixed(2)}%</p>
        </div>
    );
};

const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const safePercentage = Math.min(100, Math.max(0, percentage));
  
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-sm font-medium text-gray-400">
            €{value.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2.5">
          <div className={`${color} h-2.5 rounded-full`} style={{ width: `${safePercentage}%` }}></div>
        </div>
      </div>
    );
};

const CategorySpendingItem: React.FC<{ name: string; amount: number; total: number; category: CostCategory; }> = ({ name, amount, total, category }) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const color = category === CostCategory.MUST ? 'bg-orange-500' : 'bg-sky-500';
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-300">{name}</span>
                <span className="text-gray-400">€{amount.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const TransactionRow: React.FC<{ transaction: any; type: 'expense' | 'income' | 'investment' }> = ({ transaction, type }) => {
    const { getCurrencySymbol, accounts, investmentHoldings } = useAppContext();
    const { locale, t } = useLanguage();
    const account = accounts.find(a => a.id === transaction.accountId);
    const currencySymbol = account ? getCurrencySymbol(account.currency) : '€';
    const amount = transaction.amount ?? transaction.totalAmount;

    let description = '';
    // Specifically handle dividend transactions to ensure ticker is shown, even when passed as type 'income'
    if (transaction.type === 'DIVIDEND') {
        const holding = investmentHoldings.find(h => h.id === transaction.holdingId);
        description = `${t(`investmentTransactionTypes.${transaction.type}`)} ${holding?.ticker || ''}`;
    } else {
        switch (type) {
            case 'expense':
                description = `${transaction.subCategory}: ${transaction.description}`;
                break;
            case 'income':
                description = transaction.description;
                break;
            case 'investment':
                const holding = investmentHoldings.find(h => h.id === transaction.holdingId);
                description = `${t(`investmentTransactionTypes.${transaction.type}`)} ${holding?.ticker || ''}`;
                break;
        }
    }

    return (
        <li className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-b-0">
            <div>
                <p className="font-medium text-gray-200">{description}</p>
                <p className="text-xs text-gray-400">{new Date(transaction.date).toLocaleDateString(locale)} &middot; {account?.name}</p>
            </div>
            <span className={`font-semibold ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                {currencySymbol}{amount.toFixed(2)}
            </span>
        </li>
    );
};


const MonthlyReport: React.FC<{ data: ReportData }> = ({ data }) => {
    const { t } = useLanguage();
    const { summary, incomeDetails, expenseDetails, investmentDetails } = data;
    
    const getMonthName = (monthIndex: number): string => {
        return t(`months.${monthIndex}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-center text-gray-100">
                {t('monthlyReport.title', { month: getMonthName(data.month), year: data.year })}
            </h3>

            {/* Section 1: Financial Summary */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">{t('monthlyReport.summary')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title={t('monthlyReport.totalIncome')} amount={summary.totalIncome} color="text-green-400" />
                    <StatCard title={t('monthlyReport.totalExpenses')} amount={summary.totalSpending} color="text-red-400" />
                    <StatCard title={t('monthlyReport.cashFlow')} amount={summary.cashFlow} color={summary.cashFlow >= 0 ? 'text-blue-400' : 'text-orange-400'} />
                    <StatCard title={t('monthlyReport.netSavings')} amount={summary.netSavings} color={summary.netSavings >= 0 ? 'text-blue-400' : 'text-orange-400'} />
                    <StatCard title={t('monthlyReport.endOfMonthCash')} amount={summary.endOfMonthCash} color="text-sky-400" />
                    <StatCard title={t('monthlyReport.endOfMonthInvestments')} amount={summary.endOfMonthInvestments} color="text-purple-400" />
                    <PercentageStatCard title={t('monthlyReport.savingsRate')} percentage={summary.savingsRate} color="text-emerald-400" />
                    <PercentageStatCard title={t('monthlyReport.investmentRate')} percentage={summary.investmentRate} color="text-teal-400" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 2: Income Breakdown */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h4 className="text-lg font-semibold text-gray-200 mb-4">{t('monthlyReport.incomeBreakdown')}</h4>
                    <ul className="space-y-2">
                        <li className="flex justify-between py-2 border-b border-gray-700/50">
                           <span className="font-semibold text-gray-200">{t('monthlyReport.workIncome')}</span>
                           <span className="font-semibold text-green-400">€{incomeDetails.workIncome.toFixed(2)}</span>
                        </li>
                        {incomeDetails.dividends.map(tx => <TransactionRow key={tx.id} transaction={tx} type="income" />)}
                        {incomeDetails.extraIncome.map(tx => <TransactionRow key={tx.id} transaction={tx} type="income" />)}
                    </ul>
                </div>
                
                {/* Section 3: Expense Breakdown */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                     <h4 className="text-lg font-semibold text-gray-200 mb-4">{t('monthlyReport.expenseBreakdown')}</h4>
                     <div className="space-y-4">
                        <ProgressBar value={expenseDetails.mustSpending} max={summary.totalSpending} color="bg-orange-500" label={t('monthlyReport.musts')} />
                        <ProgressBar value={expenseDetails.wantsSpending} max={summary.totalSpending} color="bg-sky-500" label={t('monthlyReport.wants')} />
                        
                        {Object.keys(expenseDetails.bySubCategory).length > 0 && (
                             <div className="pt-4 border-t border-gray-700">
                                <h5 className="text-md font-semibold text-gray-300 mb-3">{t('monthlyReport.spendingByCategory')}</h5>
                                <div className="space-y-3">
                                    {(Object.entries(expenseDetails.bySubCategory) as [string, { total: number, category: CostCategory }][])
                                        .sort(([, a], [, b]) => b.total - a.total)
                                        .map(([name, catData]) => (
                                            <CategorySpendingItem 
                                                key={name}
                                                name={name}
                                                amount={catData.total}
                                                total={summary.totalSpending}
                                                category={catData.category}
                                            />
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            </div>

            {/* Section 4: Investment Activity */}
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">{t('monthlyReport.investmentActivity')}</h4>
                
                <div className="mb-4 pb-4 border-b border-gray-700">
                    <h5 className="text-md font-semibold text-gray-300 mb-3">{t('monthlyReport.monthlyPerformance')}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <PerformanceStat title={t('monthlyReport.totalPortfolio')} percentage={investmentDetails.performance.total} />
                        <PerformanceStat title={t('monthlyReport.stocks')} percentage={investmentDetails.performance.stocks} />
                        <PerformanceStat title={t('monthlyReport.etfs')} percentage={investmentDetails.performance.etfs} />
                        <PerformanceStat title={t('monthlyReport.crypto')} percentage={investmentDetails.performance.crypto} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                        <p className="text-sm text-gray-400">{t('monthlyReport.startValue')}</p>
                        <p className="font-semibold text-gray-200">€{investmentDetails.startValue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">{t('monthlyReport.netInflows')}</p>
                        <p className="font-semibold text-gray-200">€{investmentDetails.netInflows.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">{t('monthlyReport.endValue')}</p>
                        <p className="font-semibold text-gray-200">€{investmentDetails.endValue.toFixed(2)}</p>
                    </div>
                </div>

                {(investmentDetails.buys.length > 0 || investmentDetails.sells.length > 0) && (
                    <div className="pt-4 border-t border-gray-700">
                        <h5 className="text-md font-semibold text-gray-300 mb-2">{t('monthlyReport.transactionsThisMonth')}</h5>
                        <ul className="space-y-1">
                            {[...investmentDetails.buys, ...investmentDetails.sells]
                                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map(tx => (
                                    <TransactionRow key={tx.id} transaction={tx} type="investment"/>
                                ))
                            }
                        </ul>
                    </div>
                )}
             </div>
        </div>
    );
};

export default MonthlyReport;