
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

const Budget: React.FC = () => {
  const { budget, updateBudget } = useAppContext();
  const { t } = useLanguage();

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIncome = Number(e.target.value) || 0;
    updateBudget({ ...budget, monthlyIncome: newIncome });
  };

  const handleMustChange = (value: number) => {
    const newMust = Math.min(value, 100 - budget.wantsPercentage);
    const newSavings = 100 - newMust - budget.wantsPercentage;
    updateBudget({ ...budget, mustPercentage: newMust, savingsPercentage: newSavings });
  };
  
  const handleWantsChange = (value: number) => {
    const newWants = Math.min(value, 100 - budget.mustPercentage);
    const newSavings = 100 - budget.mustPercentage - newWants;
    updateBudget({ ...budget, wantsPercentage: newWants, savingsPercentage: newSavings });
  };

  const StatCard: React.FC<{ title: string; percentage: number; amount: number; color: string }> = ({ title, percentage, amount, color }) => (
    <div className={`bg-gray-800 p-4 rounded-lg shadow-md border-l-4 ${color}`}>
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
            <span className="text-lg font-bold text-gray-100">{percentage}%</span>
        </div>
        <p className="text-2xl font-bold text-gray-100 mt-2">€{amount.toFixed(2)}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-100">{t('budget.title')}</h2>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <label htmlFor="income" className="block text-sm font-medium text-gray-300 mb-2">{t('budget.monthlyIncome')}</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">€</span>
                <input
                    id="income"
                    type="number"
                    value={budget.monthlyIncome}
                    onChange={handleIncomeChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">{t('budget.allocation')}</h3>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('budget.musts')} ({budget.mustPercentage}%)</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={budget.mustPercentage}
                    onChange={e => handleMustChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('budget.wants')} ({budget.wantsPercentage}%)</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={budget.wantsPercentage}
                    onChange={e => handleWantsChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>
            
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title={t('budget.musts')} percentage={budget.mustPercentage} amount={budget.monthlyIncome * (budget.mustPercentage/100)} color="border-orange-500" />
            <StatCard title={t('budget.wants')} percentage={budget.wantsPercentage} amount={budget.monthlyIncome * (budget.wantsPercentage/100)} color="border-sky-500" />
            <StatCard title={t('budget.savings')} percentage={Math.max(0, budget.savingsPercentage)} amount={budget.monthlyIncome * (Math.max(0, budget.savingsPercentage)/100)} color="border-emerald-500" />
        </div>
    </div>
  );
};

export default Budget;
