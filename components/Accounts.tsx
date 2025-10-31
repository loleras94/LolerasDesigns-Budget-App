


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Account, AccountType, Currency } from '../types';
import { ACCOUNT_TYPES } from '../constants';
import { TrashIcon, PlusIcon, WalletIcon, SwitchHorizontalIcon, Bars6Icon, ChevronDownIcon, ChevronUpIcon, BankBuildingIcon, BrokerageIcon, CashBillIcon, CryptoCoinIcon } from './Icons';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import useLocalStorage from '../hooks/useLocalStorage';

const BudgetSettingsSection: React.FC = () => {
    const { budget, updateBudget } = useAppContext();
    const { t } = useLanguage();
    const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

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

    const mustBudget = useMemo(() => budget.monthlyIncome * (budget.mustPercentage / 100), [budget]);
    const wantsBudget = useMemo(() => budget.monthlyIncome * (budget.wantsPercentage / 100), [budget]);
    const savingsGoal = useMemo(() => budget.monthlyIncome * (budget.savingsPercentage / 100), [budget]);

    const StatCard: React.FC<{ title: string; percentage: number; amount: number; color: string }> = ({ title, percentage, amount, color }) => (
        <div className={`bg-gray-700/50 p-4 rounded-lg shadow-md border-l-4 ${color}`}>
            <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold text-gray-200 truncate">{title}</h3>
                <span className="text-md font-bold text-gray-100">{percentage}%</span>
            </div>
            <p className="text-xl font-bold text-gray-100 mt-2">€{amount.toFixed(2)}</p>
        </div>
    );

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <button 
                onClick={() => setIsBudgetSettingsOpen(!isBudgetSettingsOpen)} 
                className="w-full flex items-center justify-center space-x-2 text-sm bg-gray-700 hover:bg-gray-600/80 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors"
                aria-expanded={isBudgetSettingsOpen}
            >
                <span>{t('accounts.budgetSettings')}</span>
                {isBudgetSettingsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>

            {isBudgetSettingsOpen && (
                <div className="space-y-6 pt-4 border-t border-gray-700 animate-fade-in">
                    <div>
                        <label htmlFor="income" className="block text-sm font-medium text-gray-300 mb-2">{t('accounts.monthlyIncome')}</label>
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

                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-200">{t('accounts.allocation')}</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('accounts.musts')} ({budget.mustPercentage}%)</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={budget.mustPercentage}
                                onChange={e => handleMustChange(Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('accounts.wants')} ({budget.wantsPercentage}%)</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={budget.wantsPercentage}
                                onChange={e => handleWantsChange(Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title={t('accounts.musts')} percentage={budget.mustPercentage} amount={mustBudget} color="border-orange-500" />
                        <StatCard title={t('accounts.wants')} percentage={budget.wantsPercentage} amount={wantsBudget} color="border-sky-500" />
                        <StatCard title={t('accounts.savings')} percentage={Math.max(0, budget.savingsPercentage)} amount={savingsGoal} color="border-emerald-500" />
                    </div>
                </div>
            )}
        </div>
    );
};

const AccountIcon: React.FC<{ type: AccountType }> = ({ type }) => {
    switch (type) {
        case 'Bank':
            return <BankBuildingIcon className="text-indigo-400" />;
        case 'Brokerage':
            return <BrokerageIcon className="text-indigo-400" />;
        case 'Cash':
            return <CashBillIcon className="text-indigo-400" />;
        case 'Crypto':
            return <CryptoCoinIcon className="text-indigo-400" />;
        default:
            return <WalletIcon className="text-indigo-400" />;
    }
};

const Accounts: React.FC = () => {
    const { 
        accounts, addAccount, deleteAccount, getAccountBalance, getCurrencySymbol, 
        loadTestData, loadAllHistoricalData, moveFunds, reorderAccounts, importAllData, 
        transactions, budget, investmentHoldings, investmentTransactions, exchangeRate, 
        monthlySummaries, reports, customCategories 
    } = useAppContext();
    const { language, changeLanguage, t } = useLanguage();

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<AccountType>('Bank');
    const [newBalance, setNewBalance] = useState('');
    const [newCurrency, setNewCurrency] = useState<Currency>(Currency.EUR);

    const [isMovingFunds, setIsMovingFunds] = useState(false);
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [moveAmount, setMoveAmount] = useState('');
    const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);
    const [moveDescription, setMoveDescription] = useState('');
    const [moveError, setMoveError] = useState('');

    const expenseFileInput = useRef<HTMLInputElement>(null);
    const dividendsFileInput = useRef<HTMLInputElement>(null);
    const monthEndFileInput = useRef<HTMLInputElement>(null);
    const investmentFileInput = useRef<HTMLInputElement>(null);
    const [expenseFile, setExpenseFile] = useState<File | null>(null);
    const [dividendsFile, setDividendsFile] = useState<File | null>(null);
    const [monthEndFile, setMonthEndFile] = useState<File | null>(null);
    const [investmentFile, setInvestmentFile] = useState<File | null>(null);
    const [fileStatus, setFileStatus] = useState<{ type: 'error' | 'success' | 'info' | 'none', message: string }>({ type: 'none', message: '' });

    const importFileInput = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'error' | 'success' | 'none', message: string }>({ type: 'none', message: '' });

    // State for drag and drop
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // State for delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    
    // State for sorting
    type SortByType = 'custom' | 'name' | 'balance' | 'type';
    const [sortBy, setSortBy] = useLocalStorage<SortByType>('accountsSortBy', 'custom');


    useEffect(() => {
        if (accounts.length > 0 && !fromAccountId) {
            setFromAccountId(accounts[0].id);
        }
    }, [accounts, fromAccountId]);

    const fromAccountCurrencySymbol = useMemo(() => {
        if (!fromAccountId) return '';
        const account = accounts.find(a => a.id === fromAccountId);
        return account ? getCurrencySymbol(account.currency) : '';
    }, [fromAccountId, accounts, getCurrencySymbol]);
    
    const sortedAccounts = useMemo(() => {
        // Create a mutable copy for sorting
        const accountsWithBalance = accounts.map(account => ({
            ...account,
            balance: getAccountBalance(account.id)
        }));

        switch (sortBy) {
            case 'name':
                return accountsWithBalance.sort((a, b) => a.name.localeCompare(b.name));
            case 'balance':
                return accountsWithBalance.sort((a, b) => b.balance - a.balance);
            case 'type':
                const typeOrder = ACCOUNT_TYPES;
                return accountsWithBalance.sort((a, b) =>
                    typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.name.localeCompare(b.name)
                );
            case 'custom':
            default:
                const accountOrderMap = new Map(accounts.map((acc, index) => [acc.id, index]));
                return accountsWithBalance.sort((a, b) => (accountOrderMap.get(a.id) ?? 0) - (accountOrderMap.get(b.id) ?? 0));
        }
    }, [accounts, sortBy, getAccountBalance]);


    const handleAddAccount = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName && newBalance) {
            addAccount({ name: newName, type: newType, initialBalance: parseFloat(newBalance), currency: newCurrency });
            setNewName('');
            setNewType('Bank');
            setNewBalance('');
            setNewCurrency(Currency.EUR);
            setIsAdding(false);
        }
    };
    
    const handleMoveFunds = (e: React.FormEvent) => {
        e.preventDefault();
        setMoveError('');
        const amount = parseFloat(moveAmount);
        const fromAccount = accounts.find(a => a.id === fromAccountId);
        const toAccount = accounts.find(a => a.id === toAccountId);

        if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
            setMoveError(t('accounts.errorMoveFunds'));
            return;
        }
        if (fromAccountId === toAccountId) {
            setMoveError(t('accounts.errorSameAccount'));
            return;
        }
        if (!fromAccount || !toAccount) return;

        const finalDescription = moveDescription || t('accounts.defaultTransferDescription', { from: fromAccount.name, to: toAccount.name });
        moveFunds({ fromAccountId, toAccountId, amount, date: moveDate, description: finalDescription });
        
        // Reset form
        setIsMovingFunds(false);
        setMoveAmount('');
        setMoveDate(new Date().toISOString().split('T')[0]);
        setMoveDescription('');
        setToAccountId('');
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      changeLanguage(e.target.value as 'en' | 'el');
    };

    const toggleAdd = () => {
        setIsAdding(!isAdding);
        if (isMovingFunds) setIsMovingFunds(false);
    }
    
    const toggleMove = () => {
        setIsMovingFunds(!isMovingFunds);
        if (isAdding) setIsAdding(false);
    }

    const handleFileLoad = async () => {
        if (!expenseFile && !dividendsFile && !monthEndFile && !investmentFile) {
            setFileStatus({ type: 'error', message: t('accounts.noFileSelectedError') });
            return;
        }
        setFileStatus({ type: 'info', message: t('accounts.loadingFiles') });

        const readFile = (file: File | null): Promise<string | undefined> => {
            return new Promise((resolve, reject) => {
                if (!file) {
                    resolve(undefined);
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(new Error("Error reading file: " + file.name));
                reader.readAsText(file);
            });
        };

        try {
            const [expensesJson, dividendsJson, monthEndJson, investmentsJson] = await Promise.all([
                readFile(expenseFile),
                readFile(dividendsFile),
                readFile(monthEndFile),
                readFile(investmentFile)
            ]);

            loadAllHistoricalData({ expensesJson, dividendsJson, monthEndJson, investmentsJson });
            
            setFileStatus({ type: 'success', message: t('accounts.fileLoadSuccess') });
            setExpenseFile(null);
            setDividendsFile(null);
            setMonthEndFile(null);
            setInvestmentFile(null);
        } catch (error: any) {
            setFileStatus({ type: 'error', message: `${t('accounts.fileLoadError')} ${error.message}` });
        }
    };
    
    const handleExport = () => {
        try {
            const dataToExport = {
                accounts,
                transactions,
                budget,
                investmentHoldings,
                investmentTransactions,
                exchangeRate,
                monthlySummaries,
                reports,
                customCategories,
            };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `budget-app-data-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            setImportStatus({ type: 'error', message: 'Failed to export data.' });
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setImportStatus({ type: 'none', message: '' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                try {
                    importAllData(text);
                    setImportStatus({ type: 'success', message: t('accounts.importSuccess') });
                } catch (error: any) {
                    setImportStatus({ type: 'error', message: error.message });
                }
            }
        };
        reader.onerror = () => {
            setImportStatus({ type: 'error', message: t('accounts.fileReadError') });
        };
        reader.readAsText(file);

        event.target.value = '';
    };


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragOverIndex(index);
    };

    const handleDragEnd = useCallback(() => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            // Use the currently sorted list as the base for reordering
            const items = [...sortedAccounts];
            const [reorderedItem] = items.splice(draggedIndex, 1);
            items.splice(dragOverIndex, 0, reorderedItem);
            
            // The items have the extra 'balance' property which must be removed
            const newCustomOrder = items.map(({ balance, ...rest }) => rest);

            // Save this new order and set the sort type to custom
            reorderAccounts(newCustomOrder);
            setSortBy('custom');
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [draggedIndex, dragOverIndex, sortedAccounts, reorderAccounts, setSortBy]);

    const handleDeleteClick = (account: Account) => {
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsDeleteModalOpen(false);
        setAccountToDelete(null);
    };

    const handleConfirmDelete = () => {
        if (accountToDelete) {
            deleteAccount(accountToDelete.id);
            handleCloseModal();
        }
    };

    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";
    const fileStatusColors = {
        info: 'text-blue-300',
        success: 'text-green-400',
        error: 'text-red-400',
        none: 'text-gray-500',
    };
     const importStatusColors = {
        success: 'text-green-400',
        error: 'text-red-400',
        none: '',
    };

    const FileInput: React.FC<{
        title: string;
        description: string;
        fileInputRef: React.RefObject<HTMLInputElement>;
        selectedFile: File | null;
        onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    }> = ({ title, description, fileInputRef, selectedFile, onFileChange }) => (
         <div>
            <h4 className="font-semibold text-orange-300">{title}</h4>
            <p className="text-xs text-orange-400/80 mb-2">{description}</p>
            <div className="flex items-center gap-2">
               <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="hidden"
                    accept=".json,.txt"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
                >
                    {t('accounts.selectFile')}
                </button>
                 <span className="text-sm text-gray-400 truncate w-full">
                    {selectedFile ? selectedFile.name : t('accounts.noFileSelected')}
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-end sm:items-center gap-4">
                <div className="flex items-center space-x-2 self-start sm:self-center">
                     <button 
                        onClick={toggleMove} 
                        className="flex items-center space-x-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-500"
                        disabled={accounts.length < 2}
                    >
                        <SwitchHorizontalIcon />
                        <span className="hidden sm:inline">{isMovingFunds ? t('accounts.cancel') : t('accounts.moveFunds')}</span>
                    </button>
                    <button 
                        onClick={toggleAdd} 
                        className="flex items-center space-x-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon />
                        <span className="hidden sm:inline">{isAdding ? t('accounts.cancel') : t('accounts.addAccount')}</span>
                    </button>
                </div>
            </div>
            
            {isAdding && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg animate-fade-in">
                    <form onSubmit={handleAddAccount} className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('accounts.newAccountTitle')}</h3>
                        <div>
                            <label htmlFor="accName" className={labelClasses}>{t('accounts.accountName')}</label>
                            <input id="accName" type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('accounts.accountNamePlaceholder')} className={inputClasses}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="accType" className={labelClasses}>{t('accounts.type')}</label>
                                <select id="accType" value={newType} onChange={e => setNewType(e.target.value as AccountType)} className={inputClasses}>
                                    {ACCOUNT_TYPES.map(type => <option key={type} value={type}>{t(`accountTypes.${type}`)}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="accBalance" className={labelClasses}>{t('accounts.initialBalance')}</label>
                                <input id="accBalance" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0.00" className={inputClasses} step="0.01"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="accCurrency" className={labelClasses}>{t('accounts.currency')}</label>
                            <select id="accCurrency" value={newCurrency} onChange={e => setNewCurrency(e.target.value as Currency)} className={inputClasses}>
                                <option value={Currency.EUR}>{t('accounts.euro')}</option>
                                <option value={Currency.USD}>{t('accounts.dollar')}</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">{t('accounts.saveAccount')}</button>
                    </form>
                </div>
            )}
            
            {isMovingFunds && (
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg animate-fade-in">
                    <form onSubmit={handleMoveFunds} className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('accounts.moveFundsTitle')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="fromAccount" className={labelClasses}>{t('accounts.from')}</label>
                                <select id="fromAccount" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className={inputClasses}>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="toAccount" className={labelClasses}>{t('accounts.to')}</label>
                                 <select id="toAccount" value={toAccountId} onChange={e => setToAccountId(e.target.value)} className={inputClasses}>
                                    <option value="">{t('accounts.selectAccount')}</option>
                                    {accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <label htmlFor="moveAmount" className={labelClasses}>{t('accounts.amount')}</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{fromAccountCurrencySymbol}</span>
                                    <input id="moveAmount" type="number" value={moveAmount} onChange={e => setMoveAmount(e.target.value)} placeholder="0.00" className={`${inputClasses} pl-7`} step="0.01"/>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="moveDate" className={labelClasses}>{t('accounts.date')}</label>
                                <input id="moveDate" type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} className={inputClasses}/>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="moveDesc" className={labelClasses}>{t('accounts.descriptionOptional')}</label>
                            <input id="moveDesc" type="text" value={moveDescription} onChange={e => setMoveDescription(e.target.value)} placeholder={t('accounts.descriptionPlaceholder')} className={inputClasses}/>
                        </div>
                        {moveError && <p className="text-red-400 text-sm">{moveError}</p>}
                        <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">{t('accounts.confirmTransfer')}</button>
                    </form>
                </div>
            )}
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="text-base font-semibold text-gray-200">{t('accounts.title')}</h3>
                     <div className="flex items-center gap-2">
                        <label htmlFor="sort-accounts" className="text-xs font-medium text-gray-300 whitespace-nowrap">{t('investments.sortBy')}</label>
                        <select
                            id="sort-accounts"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortByType)}
                            className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="custom">{t('accounts.sort.custom')}</option>
                            <option value="name">{t('accounts.sort.name')}</option>
                            <option value="balance">{t('accounts.sort.balance')}</option>
                            <option value="type">{t('accounts.sort.type')}</option>
                        </select>
                    </div>
                </div>
                 <div className="space-y-3">
                    {accounts.length > 1 && <p className="text-xs text-center text-gray-500">{t('accounts.reorderHint')}</p>}
                    {sortedAccounts.length > 0 ? sortedAccounts.map((acc, index) => (
                        <div 
                            key={acc.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            className={`p-2 rounded-lg shadow-md flex items-center justify-between transition-all duration-300 bg-gray-700/50 ${
                                draggedIndex === index ? 'opacity-50' : 'opacity-100'
                            } ${
                                dragOverIndex === index ? 'bg-gray-600' : ''
                            }`}
                        >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="cursor-grab flex-shrink-0">
                                    <AccountIcon type={acc.type} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-100 truncate">{acc.name}</p>
                                    <p className="text-sm text-gray-400">{t(`accountTypes.${acc.type}`)}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                               <p className="text-md font-bold text-gray-100">{getCurrencySymbol(acc.currency)}{acc.balance.toFixed(2)}</p>
                               <button onClick={() => handleDeleteClick(acc)} className="text-red-400 hover:text-red-300 mt-1 transition-colors">
                                    <TrashIcon />
                               </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center p-8">
                            <p className="text-gray-400">{t('accounts.noAccounts')}</p>
                            <p className="text-gray-500 text-sm">{t('accounts.noAccountsHint')}</p>
                        </div>
                    )}
                </div>
            </div>

            <BudgetSettingsSection />

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('accounts.appSettings')}</h3>
                <div className="flex justify-between items-center">
                    <label htmlFor="language-select" className={labelClasses}>{t('accounts.language')}</label>
                    <select
                      id="language-select"
                      value={language}
                      onChange={handleLanguageChange}
                      aria-label={t('languageSelectorAria')}
                      className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="en">English</option>
                      <option value="el">Ελληνικά</option>
                    </select>
                </div>
            </div>

            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg mt-8">
                <h3 className="font-bold text-red-300 text-center">{t('accounts.devZone')}</h3>
                <div className="space-y-4 my-3">
                    <div className="space-y-4">
                        <FileInput 
                            title={t('accounts.loadExpensesFileTitle')}
                            description={t('accounts.loadExpensesFileDescription')}
                            fileInputRef={expenseFileInput}
                            selectedFile={expenseFile}
                            onFileChange={(e) => setExpenseFile(e.target.files?.[0] || null)}
                        />
                         <FileInput 
                            title={t('accounts.loadInvestmentsFileTitle')}
                            description={t('accounts.loadInvestmentsFileDescription')}
                            fileInputRef={investmentFileInput}
                            selectedFile={investmentFile}
                            onFileChange={(e) => setInvestmentFile(e.target.files?.[0] || null)}
                        />
                        <FileInput 
                            title={t('accounts.loadDividendsFileTitle')}
                            description={t('accounts.loadDividendsFileDescription')}
                            fileInputRef={dividendsFileInput}
                            selectedFile={dividendsFile}
                            onFileChange={(e) => setDividendsFile(e.target.files?.[0] || null)}
                        />
                        <FileInput 
                            title={t('accounts.loadMonthEndFileTitle')}
                            description={t('accounts.loadMonthEndFileDescription')}
                            fileInputRef={monthEndFileInput}
                            selectedFile={monthEndFile}
                            onFileChange={(e) => setMonthEndFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <div className="text-center pt-4">
                         <button
                            onClick={handleFileLoad}
                            disabled={!expenseFile && !dividendsFile && !monthEndFile && !investmentFile}
                            className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                            {t('accounts.loadAllFilesButton')}
                        </button>
                        <p className={`text-sm mt-2 h-4 ${fileStatusColors[fileStatus.type]}`}>
                            {fileStatus.message || ' '}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-red-500/30">
                        <h4 className="font-semibold text-center text-red-300 mb-2">{t('accounts.exportImport')}</h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={handleExport}
                                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {t('accounts.exportData')}
                            </button>
                            <input
                                type="file"
                                ref={importFileInput}
                                onChange={handleFileImport}
                                className="hidden"
                                accept=".json"
                            />
                            <button
                                onClick={() => importFileInput.current?.click()}
                                className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                {t('accounts.importData')}
                            </button>
                        </div>
                        <p className={`text-sm text-center mt-2 h-4 ${importStatusColors[importStatus.type]}`}>
                            {importStatus.message || ' '}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-red-500/30 text-center">
                        <p className="text-sm text-red-400">{t('accounts.devZoneWarning')}</p>
                        <button
                            onClick={loadTestData}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
                        >
                            {t('accounts.loadTestData')}
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseModal}
                title={t('accounts.deleteConfirmationTitle')}
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        {t('accounts.deleteConfirmationBody', { accountName: accountToDelete?.name || '' })}
                    </p>
                    <p className="text-sm text-yellow-400 font-semibold">
                        {t('accounts.deleteConfirmationWarning')}
                    </p>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={handleCloseModal}
                            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            {t('accounts.cancel')}
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {t('accounts.delete')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Accounts;
