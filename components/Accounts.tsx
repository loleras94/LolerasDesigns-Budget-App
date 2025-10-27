

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Account, AccountType, Currency } from '../types';
import { ACCOUNT_TYPES } from '../constants';
import { TrashIcon, PlusIcon, WalletIcon, SwitchHorizontalIcon, Bars6Icon } from './Icons';
import { useLanguage } from '../context/LanguageContext';

const Accounts: React.FC = () => {
    const { accounts, addAccount, deleteAccount, getAccountBalance, getCurrencySymbol, loadTestData, loadAllHistoricalData, moveFunds, reorderAccounts } = useAppContext();
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

    // State for drag and drop
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);


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

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };

    const handleDragEnd = useCallback(() => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            const items = [...accounts];
            const [reorderedItem] = items.splice(draggedIndex, 1);
            items.splice(dragOverIndex, 0, reorderedItem);
            reorderAccounts(items);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [draggedIndex, dragOverIndex, accounts, reorderAccounts]);

    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";
    const fileStatusColors = {
        info: 'text-blue-300',
        success: 'text-green-400',
        error: 'text-red-400',
        none: 'text-gray-500',
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
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-100">{t('accounts.title')}</h2>
                <div className="flex items-center space-x-2">
                     <button 
                        onClick={toggleMove} 
                        className="flex items-center space-x-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-500"
                        disabled={accounts.length < 2}
                    >
                        <SwitchHorizontalIcon />
                        <span>{isMovingFunds ? t('accounts.cancel') : t('accounts.moveFunds')}</span>
                    </button>
                    <button 
                        onClick={toggleAdd} 
                        className="flex items-center space-x-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon />
                        <span>{isAdding ? t('accounts.cancel') : t('accounts.addAccount')}</span>
                    </button>
                </div>
            </div>
            
            {isAdding && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
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
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
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

            <div className="space-y-4">
                {accounts.length > 1 && <p className="text-xs text-center text-gray-500">{t('accounts.reorderHint')}</p>}
                {accounts.length > 0 ? accounts.map((acc, index) => (
                    <div 
                        key={acc.id} 
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-4 rounded-lg shadow-md flex items-center justify-between transition-all duration-300 ${
                            draggedIndex === index ? 'opacity-50' : 'opacity-100'
                        } ${
                            dragOverIndex === index ? 'bg-gray-700' : 'bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center space-x-4">
                            <Bars6Icon className="h-5 w-5 text-gray-500 cursor-grab" />
                            <WalletIcon className="text-indigo-400" />
                            <div>
                                <p className="font-semibold text-gray-100">{acc.name}</p>
                                <p className="text-sm text-gray-400">{t(`accountTypes.${acc.type}`)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-gray-100">{getCurrencySymbol(acc.currency)}{getAccountBalance(acc.id).toFixed(2)}</p>
                           <button onClick={() => deleteAccount(acc.id)} className="text-red-400 hover:text-red-300 mt-1 transition-colors">
                                <TrashIcon />
                           </button>
                        </div>
                    </div>
                )) : (
                    <div className="bg-gray-800 text-center p-8 rounded-lg">
                        <p className="text-gray-400">{t('accounts.noAccounts')}</p>
                        <p className="text-gray-500 text-sm">{t('accounts.noAccountsHint')}</p>
                    </div>
                )}
            </div>

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
        </div>
    );
};

export default Accounts;