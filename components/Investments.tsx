import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { InvestmentHolding, InvestmentTransaction, InvestmentTransactionType, InvestmentType, Currency } from '../types';
import { PlusIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, SyncIcon, SpinnerIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../context/LanguageContext';

const TransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  holding: InvestmentHolding;
}> = ({ isOpen, onClose, holding }) => {
    const { addInvestmentTransaction, accounts, getCurrencySymbol } = useAppContext();
    const { t } = useLanguage();
    const [type, setType] = useState<InvestmentTransactionType>(InvestmentTransactionType.BUY);
    const [quantity, setQuantity] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [error, setError] = useState('');

    const formatDateForDisplay = (isoDate: string) => {
      if (!isoDate) return 'DD/MM/YYYY';
      const [year, month, day] = isoDate.split('-');
      return `${day}/${month}/${year}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numQuantity = parseFloat(quantity);
        const numPrice = parseFloat(pricePerUnit);

        if (!numQuantity || numQuantity <= 0 || (type !== 'DIVIDEND' && (!numPrice || numPrice < 0)) || !date || !accountId) {
            setError(t('investments.errorRequired'));
            return;
        }

        addInvestmentTransaction({
            holdingId: holding.id,
            type,
            date,
            quantity: type === 'DIVIDEND' ? 0 : numQuantity,
            pricePerUnit: type === 'DIVIDEND' ? 0 : numPrice,
            totalAmount: type === 'DIVIDEND' ? numQuantity : numQuantity * numPrice, // for dividend, "quantity" field holds total amount
            accountId,
        });

        onClose();
        setQuantity('');
        setPricePerUnit('');
        setError('');
    };
    
    if (!isOpen) return null;

    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";
    const typeColors = {
        [InvestmentTransactionType.BUY]: 'bg-green-500',
        [InvestmentTransactionType.SELL]: 'bg-red-500',
        [InvestmentTransactionType.DIVIDEND]: 'bg-blue-500',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{t('investments.newTransactionFor', { ticker: holding.ticker, currencySymbol: getCurrencySymbol(holding.currency) })}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex bg-gray-700 p-1 rounded-lg">
                        <button type="button" onClick={() => setType(InvestmentTransactionType.BUY)} className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors ${type === InvestmentTransactionType.BUY ? 'bg-green-500 text-white' : 'text-gray-300'}`}>{t('investments.buy')}</button>
                        <button type="button" onClick={() => setType(InvestmentTransactionType.SELL)} className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors ${type === InvestmentTransactionType.SELL ? 'bg-red-500 text-white' : 'text-gray-300'}`}>{t('investments.sell')}</button>
                        <button type="button" onClick={() => setType(InvestmentTransactionType.DIVIDEND)} className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors ${type === InvestmentTransactionType.DIVIDEND ? 'bg-blue-500 text-white' : 'text-gray-300'}`}>{t('investments.dividend')}</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="quantity" className={labelClasses}>{type === 'DIVIDEND' ? t('investments.totalAmount') : t('investments.quantity')}</label>
                            <input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className={inputClasses} step="any"/>
                        </div>
                        {type !== 'DIVIDEND' && <div>
                            <label htmlFor="price" className={labelClasses}>{t('investments.pricePerUnit')}</label>
                            <input id="price" type="number" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0.00" className={inputClasses} step="any"/>
                        </div>}
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className={labelClasses}>{t('investments.date')}</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formatDateForDisplay(date)}
                                readOnly
                                placeholder="DD/MM/YYYY"
                                className={inputClasses}
                              />
                              <input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label={t('investments.date')}
                              />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="account" className={labelClasses}>{t('investments.account')}</label>
                            <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} className={inputClasses}>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({getCurrencySymbol(acc.currency)})</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">{t('investments.cancel')}</button>
                        <button type="submit" className={`${typeColors[type]} text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity`}>{t('investments.add')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Investments: React.FC = () => {
    const { investmentHoldings, addInvestmentHolding, updateInvestmentHolding, investmentTransactions, accounts, convertCurrency, getCurrencySymbol, monthlySummaries, reports, getAccountBalanceAtDate } = useAppContext();
    const { t, locale } = useLanguage();
    
    // State for adding a holding
    const [isAddingHolding, setIsAddingHolding] = useState(false);
    const [newHoldingName, setNewHoldingName] = useState('');
    const [newHoldingTicker, setNewHoldingTicker] = useState('');
    const [newHoldingType, setNewHoldingType] = useState<InvestmentType | null>(null);
    const [newHoldingCurrency, setNewHoldingCurrency] = useState<Currency>(Currency.USD);
    const [newHoldingIsin, setNewHoldingIsin] = useState('');
    const [addStep, setAddStep] = useState<'type' | 'isin' | 'details'>('type');
    const [isFetchingIsin, setIsFetchingIsin] = useState(false);
    const [isinFetchError, setIsinFetchError] = useState('');
    const [isIsinVerifiedOnAdd, setIsinVerifiedOnAdd] = useState(false);

    const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
    const [modalState, setModalState] = useState<{ isOpen: boolean; holding: InvestmentHolding | null; }>({ isOpen: false, holding: null });
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [priceUpdateError, setPriceUpdateError] = useState('');
    const [sortBy, setSortBy] = useState('alphabetical');

    const resetAddHolding = () => {
        setIsAddingHolding(false);
        setNewHoldingName('');
        setNewHoldingTicker('');
        setNewHoldingType(null);
        setNewHoldingCurrency(Currency.USD);
        setNewHoldingIsin('');
        setAddStep('type');
        setIsFetchingIsin(false);
        setIsinFetchError('');
        setIsinVerifiedOnAdd(false);
    };
    
    const handleSelectType = (type: InvestmentType) => {
        setNewHoldingType(type);
        if (type === 'Crypto') {
            setAddStep('details');
        } else {
            setAddStep('isin');
        }
    };
    
    const handleIsinSearch = async () => {
        if (!newHoldingIsin.trim()) {
            setIsinFetchError(t('investments.errorIsinEmpty'));
            return;
        }
        setIsFetchingIsin(true);
        setIsinFetchError('');
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Given the ISIN "${newHoldingIsin.trim()}", find its official name and a common stock ticker. Respond with ONLY a valid JSON object containing "name" and "ticker" keys. If you cannot find the information, respond with an empty JSON object {}. Example: {"name": "Apple Inc.", "ticker": "AAPL"}`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });
            
            let responseText = response.text.trim();
            const jsonMatch = responseText.match(/```(json)?([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[2]) {
                responseText = jsonMatch[2].trim();
            }
            
            const data = JSON.parse(responseText);
    
            if (data.name && data.ticker) {
                setNewHoldingName(data.name);
                setNewHoldingTicker(data.ticker.toUpperCase());
                setAddStep('details');
                setIsinVerifiedOnAdd(true);
            } else {
                setIsinFetchError(t('investments.errorIsinNotFound'));
                setIsinVerifiedOnAdd(false);
            }
        } catch (error) {
            console.error("Failed to fetch ISIN details:", error);
            setIsinFetchError(t('investments.errorIsinFetch'));
        } finally {
            setIsFetchingIsin(false);
        }
    };
    
    const handleAddHolding = (e: React.FormEvent) => {
        e.preventDefault();
        const ticker = newHoldingTicker.toUpperCase();
        if (newHoldingName && ticker && newHoldingType) {
            addInvestmentHolding({ 
                name: newHoldingName, 
                ticker,
                investmentType: newHoldingType,
                currency: newHoldingCurrency,
                isin: newHoldingIsin,
                isinVerified: isIsinVerifiedOnAdd,
            });
            resetAddHolding();
        }
    };

    const handleUpdateAllPrices = async () => {
        if (investmentHoldings.length === 0) return;
    
        setIsUpdatingPrices(true);
        setPriceUpdateError('');
    
        try {
            const holdingsToUpdate = investmentHoldings.map(h => ({
                id: h.id,
                ticker: h.ticker.toUpperCase(),
                isin: h.isin,
                isinVerified: h.isinVerified === true,
            }));

            if (holdingsToUpdate.length === 0) {
                setIsUpdatingPrices(false);
                return;
            };
    
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Use Google Search to find data for the following financial instruments.
- For each instrument in the input array, you MUST return an object in the output array containing the original "id".
- If an "isin" is provided and the instrument is not marked as "isinVerified", you MUST use the ISIN as the primary identifier for the lookup. Based on the ISIN, find and return the official "name" and "ticker".
- Find the "currentPrice" for each instrument.
- Find the primary trading "currency" ("USD" or "EUR") for each instrument.
- Respond with ONLY a valid JSON array of objects. Each object must contain the original "id" and can contain "name", "ticker", "currentPrice", and "currency".
- If you cannot find information for an instrument, omit it from the array.

Instruments: ${JSON.stringify(holdingsToUpdate)}

Example response: [{"id": "h-aapl-1", "name": "Apple Inc.", "ticker": "AAPL", "currentPrice": 170.12, "currency": "USD"}, {"id": "h-btc-1", "currentPrice": 67493.43, "currency": "USD"}]`;
    
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

            let priceData: { id: string; name?: string; ticker?: string; currentPrice?: number; currency?: string }[];
            try {
                priceData = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse JSON from API response:", responseText);
                throw new Error("API returned a non-JSON response.");
            }
            
            if (!priceData || !Array.isArray(priceData)) {
                throw new Error("API returned invalid data format.");
            }
    
            priceData.forEach(item => {
                const originalHolding = investmentHoldings.find(h => h.id === item.id);
                if (!originalHolding) return;

                const updatedHolding = { ...originalHolding };
                let hasChanged = false;

                // Logic to update name/ticker if ISIN was used for the first time
                if (originalHolding.isin && !originalHolding.isinVerified && item.name && item.ticker) {
                    if (updatedHolding.name !== item.name) {
                        updatedHolding.name = item.name;
                        hasChanged = true;
                    }
                    if (updatedHolding.ticker !== item.ticker.toUpperCase()) {
                        updatedHolding.ticker = item.ticker.toUpperCase();
                        hasChanged = true;
                    }
                    updatedHolding.isinVerified = true; // Mark as verified
                    hasChanged = true;
                }

                // Logic to update price
                if (item.currentPrice !== undefined && item.currency) {
                    const apiCurrency = item.currency.toUpperCase() === 'EUR' ? Currency.EUR : Currency.USD;
                    const newPriceInHoldingCurrency = convertCurrency(item.currentPrice, apiCurrency, originalHolding.currency);
                    
                    if (updatedHolding.currentPrice !== newPriceInHoldingCurrency) {
                        updatedHolding.currentPrice = newPriceInHoldingCurrency;
                        hasChanged = true;
                    }
                }

                if (hasChanged) {
                    updateInvestmentHolding(updatedHolding);
                }
            });
    
        } catch (error) {
            console.error("Failed to update prices:", error);
            setPriceUpdateError(t('investments.errorUpdatePrices'));
        } finally {
            setIsUpdatingPrices(false);
        }
    };
    
    const handlePriceInputChange = (holdingId: string, value: string) => {
        setPriceInputs(prev => ({ ...prev, [holdingId]: value }));
    };

    const handleUpdatePrice = (holding: InvestmentHolding) => {
        const newPriceStr = priceInputs[holding.id];
    
        if (newPriceStr === undefined) return; // Nothing to update
    
        if (newPriceStr === '') {
            // User cleared the input, so remove the price property
            const { currentPrice, ...rest } = holding;
            updateInvestmentHolding(rest);
        } else {
            const newPrice = parseFloat(newPriceStr);
            if (!isNaN(newPrice) && newPrice >= 0) {
                // User entered a valid price
                updateInvestmentHolding({ ...holding, currentPrice: newPrice });
            }
        }
        
        // After attempting update, clear local state to re-sync with global state.
        setPriceInputs(prev => {
            const newState = { ...prev };
            delete newState[holding.id];
            return newState;
        });
    };

    const holdingsSummary = useMemo(() => {
        const holdingsWithMarketValue = investmentHoldings.map(holding => {
            const investmentType = holding.investmentType || 'Stock';
            const transactions = investmentTransactions.filter(t => t.holdingId === holding.id);
            const quantity = transactions.reduce((sum, t) => {
                if (t.type === InvestmentTransactionType.BUY) return sum + t.quantity;
                if (t.type === InvestmentTransactionType.SELL) return sum - t.quantity;
                return sum;
            }, 0);
            
            const { costBasis, proceeds } = transactions.reduce((acc, t) => {
                if (t.type === InvestmentTransactionType.BUY) acc.costBasis += t.totalAmount;
                if (t.type === InvestmentTransactionType.SELL) acc.proceeds += t.totalAmount;
                return acc;
            }, { costBasis: 0, proceeds: 0 });

            const totalDividends = transactions.reduce((sum, t) => {
                if (t.type === InvestmentTransactionType.DIVIDEND) return sum + t.totalAmount;
                return sum;
            }, 0);
            
            const marketValue = holding.currentPrice && quantity > 0 ? holding.currentPrice * quantity : 0;
            const marketValueInEUR = convertCurrency(marketValue, holding.currency, Currency.EUR);

            const totalReturn = (marketValue + proceeds + totalDividends) - costBasis;
            const returnPercentage = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;


            return { ...holding, investmentType, quantity, costBasis, transactionCount: transactions.length, returnPercentage, totalReturn, marketValue, marketValueInEUR, transactions };
        }).filter(h => h.quantity > 0.00001 || h.transactionCount === 0);

        const totalInvestmentsInEUR = holdingsWithMarketValue.reduce((sum, h) => sum + h.marketValueInEUR, 0);

        const calculatedHoldings = holdingsWithMarketValue.map(holding => {
            const allocationPercentage = totalInvestmentsInEUR > 0 ? (holding.marketValueInEUR / totalInvestmentsInEUR) * 100 : 0;
            return { ...holding, allocationPercentage };
        });

        switch (sortBy) {
            case 'marketValue':
                return calculatedHoldings.sort((a, b) => b.marketValueInEUR - a.marketValueInEUR);
            case 'profitPercentage':
                return calculatedHoldings.sort((a, b) => b.returnPercentage - a.returnPercentage);
            case 'alphabetical':
            default:
                return calculatedHoldings.sort((a, b) => a.ticker.localeCompare(b.ticker));
        }
    }, [investmentHoldings, investmentTransactions, sortBy, convertCurrency]);

    const recentTransactions = [...investmentTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const getHolding = (id: string) => investmentHoldings.find(h => h.id === id);
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'N/A';
    
    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
    const labelClasses = "block text-sm font-medium text-gray-300 mb-1";

    const portfolioStats = useMemo(() => {
        let totalMarketValueEUR = 0;
        let totalCostBasisEUR = 0;
        let totalReturnEUR = 0;
        const valueByType: { [key in 'stocks' | 'etfs' | 'crypto']: number } = { stocks: 0, etfs: 0, crypto: 0 };
        
        const currentYear = new Date().getFullYear();
        let totalYtdBuysEUR = 0;
        let totalYtdSellsEUR = 0;
        let ytdDividendsEUR = 0;
        let totalDividendsEUR = 0;
        let annualDividendsEUR = 0;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
        holdingsSummary.forEach(h => {
            totalMarketValueEUR += h.marketValueInEUR;
            totalCostBasisEUR += convertCurrency(h.costBasis, h.currency, Currency.EUR);
            totalReturnEUR += convertCurrency(h.totalReturn, h.currency, Currency.EUR);
    
            if (h.investmentType === 'Stock') {
                valueByType.stocks += h.marketValueInEUR;
            } else if (h.investmentType === 'ETF') {
                valueByType.etfs += h.marketValueInEUR;
            } else if (h.investmentType === 'Crypto') {
                valueByType.crypto += h.marketValueInEUR;
            }

            const ytdTransactions = h.transactions.filter(t => new Date(t.date).getFullYear() === currentYear);
            
            totalYtdBuysEUR += ytdTransactions.filter(t => t.type === 'BUY').reduce((sum, t) => sum + convertCurrency(t.totalAmount, h.currency, Currency.EUR), 0);
            totalYtdSellsEUR += ytdTransactions.filter(t => t.type === 'SELL').reduce((sum, t) => sum + convertCurrency(t.totalAmount, h.currency, Currency.EUR), 0);
            
            ytdDividendsEUR += ytdTransactions.filter(t => t.type === 'DIVIDEND').reduce((sum, t) => sum + convertCurrency(t.totalAmount, h.currency, Currency.EUR), 0);
            totalDividendsEUR += h.transactions.filter(t => t.type === 'DIVIDEND').reduce((sum, t) => sum + convertCurrency(t.totalAmount, h.currency, Currency.EUR), 0);
            
            const last12MonthsTransactions = h.transactions.filter(t => new Date(t.date) >= oneYearAgo);
            annualDividendsEUR += last12MonthsTransactions
                .filter(t => t.type === 'DIVIDEND')
                .reduce((sum, t) => sum + convertCurrency(t.totalAmount, h.currency, Currency.EUR), 0);
        });
        
        const totalPLPercentage = totalCostBasisEUR > 0 ? (totalReturnEUR / totalCostBasisEUR) * 100 : 0;
        const annualDividendYield = totalMarketValueEUR > 0 ? (annualDividendsEUR / totalMarketValueEUR) * 100 : 0;
        
        // --- New YTD Calculation ---
        const prevYear = currentYear - 1;
        const startOfYearReportId = `${prevYear}-12`;
        // Find the report for Dec of last year
        const startOfYearReport = reports.find(r => r.id === startOfYearReportId);

        let ytdReturnEUR = NaN;
        let ytdReturnPercentage = NaN;

        if (startOfYearReport) {
            const investmentValueAtStartOfYearEUR = startOfYearReport.summary.endOfMonthInvestments;
            
            ytdReturnEUR = (totalMarketValueEUR + totalYtdSellsEUR + ytdDividendsEUR) - (investmentValueAtStartOfYearEUR + totalYtdBuysEUR);
            
            const netInflowsYTD = totalYtdBuysEUR - totalYtdSellsEUR;
            const denominator = investmentValueAtStartOfYearEUR + (netInflowsYTD * 0.5); // Simple Dietz method
            ytdReturnPercentage = denominator > 0 ? (ytdReturnEUR / denominator) * 100 : 0;
        }

        return {
            totalMarketValueEUR, totalCostBasisEUR, totalReturnEUR, totalPLPercentage,
            valueByType, ytdReturnEUR, ytdReturnPercentage, ytdDividendsEUR, totalDividendsEUR, annualDividendYield
        };
    }, [holdingsSummary, convertCurrency, reports]);

    const PortfolioStats = () => {
        const { totalMarketValueEUR, totalReturnEUR, totalPLPercentage, valueByType, ytdReturnEUR, ytdReturnPercentage, ytdDividendsEUR, totalDividendsEUR, annualDividendYield } = portfolioStats;
        const currentYear = new Date().getFullYear();
        const startOfYearReportId = `${currentYear - 1}-12`;
        const startOfYearReport = reports.find(r => r.id === startOfYearReportId);
        
        const StatCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
            <div className="bg-gray-700/50 p-4 rounded-lg shadow-md flex flex-col">
                <h4 className="text-md font-semibold text-gray-300 mb-3">{title}</h4>
                <div className="flex-grow flex flex-col justify-center">{children}</div>
            </div>
        );

        const ValueDisplay: React.FC<{ value: number; label: string; color?: string; sign?: boolean }> = ({ value, label, color = 'text-gray-100', sign = false }) => {
            const valueSign = value > 0 ? '+' : value < 0 ? '' : '';
            return (
                <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{sign ? valueSign : ''}€{value.toFixed(2)}</p>
                </div>
            );
        };
        const PercentDisplay: React.FC<{ value: number; label: string; color?: string }> = ({ value, label, color }) => {
            const valueSign = value > 0 ? '+' : value < 0 ? '' : '';
             const finalColor = color || (value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-300');
            return (
                 <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-bold ${finalColor}`}>{valueSign}{value.toFixed(2)}%</p>
                </div>
            )
        };
        
        const AssetItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
            const percentage = totalMarketValueEUR > 0 ? (value / totalMarketValueEUR) * 100 : 0;
            return (
                 <div className="flex justify-between items-center py-1.5">
                    <div className="flex items-center space-x-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
                        <span className="text-sm text-gray-300">{label}</span>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-sm text-gray-100">€{value.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                    </div>
                </div>
            );
        };

        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('investments.portfolioStats')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title={t('investments.totalValue')}>
                        <p className="text-3xl font-bold text-indigo-400 text-center mb-3">€{totalMarketValueEUR.toFixed(2)}</p>
                        <div className="space-y-1">
                            <h5 className="text-sm font-semibold text-gray-400 mb-1">{t('investments.assetAllocation')}</h5>
                            <AssetItem label={t('investments.stocks')} value={valueByType.stocks} color="bg-indigo-500" />
                            <AssetItem label={t('investments.etfs')} value={valueByType.etfs} color="bg-teal-500" />
                            <AssetItem label={t('dashboard.crypto')} value={valueByType.crypto} color="bg-amber-500" />
                        </div>
                    </StatCard>
                     <StatCard title={t('investments.totalPL')}>
                         <div className="grid grid-cols-2 gap-4">
                            <ValueDisplay value={totalReturnEUR} label={t('investments.pl_short')} color={totalReturnEUR >= 0 ? 'text-green-400' : 'text-red-400'} sign/>
                            <PercentDisplay value={totalPLPercentage} label={t('investments.pl_percentage')} />
                         </div>
                    </StatCard>
                     <StatCard title={t('investments.ytdPL')}>
                        {startOfYearReport ? (
                             <div className="grid grid-cols-2 gap-4">
                                <ValueDisplay value={ytdReturnEUR} label={t('investments.pl_short')} color={ytdReturnEUR >= 0 ? 'text-green-400' : 'text-red-400'} sign/>
                                <PercentDisplay value={ytdReturnPercentage} label={t('investments.pl_percentage')} />
                             </div>
                        ) : (
                            <div className="text-center text-xs text-gray-400 flex items-center justify-center h-full">
                                <p>{t('investments.ytdError')}</p>
                            </div>
                        )}
                    </StatCard>
                     <StatCard title={t('investments.dividends')}>
                        <div className="grid grid-cols-3 gap-4">
                           <ValueDisplay value={ytdDividendsEUR} label={t('investments.ytdDividends')} color="text-sky-400" />
                           <ValueDisplay value={totalDividendsEUR} label={t('investments.totalDividends')} color="text-sky-400" />
                           <PercentDisplay value={annualDividendYield} label={t('investments.yieldPercentage')} color="text-sky-400" />
                        </div>
                    </StatCard>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             {modalState.isOpen && modalState.holding && (
                <TransactionModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false, holding: null })}
                    holding={modalState.holding}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-100">{t('investments.title')}</h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="sort-investments" className="text-sm font-medium text-gray-300 whitespace-nowrap">{t('investments.sortBy')}:</label>
                        <select
                            id="sort-investments"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="alphabetical">{t('investments.sort.alphabetical')}</option>
                            <option value="marketValue">{t('investments.sort.marketValue')}</option>
                            <option value="profitPercentage">{t('investments.sort.profitPercentage')}</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center space-x-2 self-start sm:self-center">
                    <button
                        onClick={handleUpdateAllPrices}
                        disabled={isUpdatingPrices || investmentHoldings.length === 0}
                        className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        <SyncIcon className={isUpdatingPrices ? 'animate-spin' : ''} />
                        <span>{isUpdatingPrices ? t('investments.updating') : t('investments.updatePrices')}</span>
                    </button>
                    <button 
                        onClick={() => isAddingHolding ? resetAddHolding() : setIsAddingHolding(true)} 
                        className="flex items-center space-x-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon />
                        <span>{isAddingHolding ? t('investments.cancel') : t('investments.addHolding')}</span>
                    </button>
                </div>
            </div>
            
            {priceUpdateError && <p className="text-red-400 text-sm text-center mt-2">{priceUpdateError}</p>}

            <PortfolioStats />

            {isAddingHolding && (
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <form onSubmit={handleAddHolding} className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('investments.newHoldingTitle')}</h3>
                        
                        {addStep === 'type' && (
                            <div>
                                <label className={labelClasses}>{t('investments.selectType')}</label>
                                <div className="flex bg-gray-700 p-1 rounded-lg">
                                    <button type="button" onClick={() => handleSelectType('Stock')} className="w-1/3 py-2 rounded-md text-sm font-semibold transition-colors bg-sky-800 text-white hover:bg-sky-700">{t('investmentTypes.Stock')}</button>
                                    <button type="button" onClick={() => handleSelectType('ETF')} className="w-1/3 py-2 rounded-md text-sm font-semibold transition-colors bg-teal-800 text-white hover:bg-teal-700">{t('investmentTypes.ETF')}</button>
                                    <button type="button" onClick={() => handleSelectType('Crypto')} className="w-1/3 py-2 rounded-md text-sm font-semibold transition-colors bg-amber-800 text-white hover:bg-amber-700">{t('investmentTypes.Crypto')}</button>
                                </div>
                            </div>
                        )}

                        {addStep === 'isin' && (
                            <div className="space-y-3">
                                <label htmlFor="holdingIsin" className={labelClasses}>{t('investments.enterIsin')}</label>
                                <input id="holdingIsin" type="text" value={newHoldingIsin} onChange={e => setNewHoldingIsin(e.target.value.toUpperCase())} placeholder={t('investments.isinPlaceholder')} className={inputClasses} maxLength={12} />
                                {isinFetchError && <p className="text-red-400 text-sm">{isinFetchError}</p>}
                                <div className="flex items-center space-x-3">
                                    <button type="button" onClick={handleIsinSearch} disabled={isFetchingIsin} className="w-full flex justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500">
                                        {isFetchingIsin ? <SpinnerIcon className="animate-spin" /> : t('investments.isinSearch')}
                                    </button>
                                    <button type="button" onClick={() => { setAddStep('details'); setIsinVerifiedOnAdd(false); }} className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">{t('investments.noIsin')}</button>
                                </div>
                            </div>
                        )}

                        {addStep === 'details' && newHoldingType && (
                             <div className="space-y-4">
                                <h4 className="font-semibold text-gray-300">{newHoldingName ? t('investments.detailsFor', {ticker: newHoldingTicker}) : t(`investmentTypes.${newHoldingType}`)}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="holdingName" className={labelClasses}>{t('investments.name')}</label>
                                        <input id="holdingName" type="text" value={newHoldingName} onChange={e => setNewHoldingName(e.target.value)} placeholder={t('investments.namePlaceholder')} className={`${inputClasses} disabled:bg-gray-600/50`} disabled={addStep === 'details' && !!newHoldingTicker && newHoldingType !== 'Crypto' && newHoldingIsin !== ''}/>
                                    </div>
                                    <div>
                                        <label htmlFor="holdingTicker" className={labelClasses}>{t('investments.ticker')}</label>
                                        <input id="holdingTicker" type="text" value={newHoldingTicker} onChange={e => setNewHoldingTicker(e.target.value)} placeholder={t('investments.tickerPlaceholder')} className={`${inputClasses} disabled:bg-gray-600/50`} disabled={addStep === 'details' && !!newHoldingTicker && newHoldingType !== 'Crypto' && newHoldingIsin !== ''}/>
                                    </div>
                                    <div>
                                        <label htmlFor="holdingCurrency" className={labelClasses}>{t('investments.currency')}</label>
                                        <select id="holdingCurrency" value={newHoldingCurrency} onChange={e => setNewHoldingCurrency(e.target.value as Currency)} className={inputClasses}>
                                            <option value={Currency.USD}>{t('accounts.dollar')}</option>
                                            <option value={Currency.EUR}>{t('accounts.euro')}</option>
                                        </select>
                                    </div>
                                     {newHoldingType !== 'Crypto' && (
                                        <div>
                                            <label htmlFor="holdingIsinManual" className={labelClasses}>{t('investments.isin')}</label>
                                            <input id="holdingIsinManual" type="text" value={newHoldingIsin} onChange={e => setNewHoldingIsin(e.target.value)} placeholder={t('investments.isinPlaceholder')} className={inputClasses}/>
                                        </div>
                                     )}
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">{t('investments.saveHolding')}</button>
                            </div>
                        )}

                    </form>
                </div>
            )}
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-lg font-semibold text-gray-200 mb-2">{t('investments.holdings')}</h2>
                {holdingsSummary.length > 0 ? holdingsSummary.map(h => {
                    const marketValue = h.marketValue;
                    const plColor = h.totalReturn > 0 ? 'text-green-400' : h.totalReturn < 0 ? 'text-red-400' : 'text-gray-300';
                    const sign = h.totalReturn >= 0 ? '+' : '';

                    return (
                        <div key={h.id} className="bg-gray-700/50 p-4 rounded-lg flex flex-col space-y-4">
                            {/* Header */}
                            <div className="flex w-full items-center">
                                <p className="text-xl font-bold text-indigo-400 flex-shrink-0">{h.ticker}</p>
                                
                                <div className="flex-1 px-3">
                                    <input
                                        id={`price-${h.id}`}
                                        type="number"
                                        step="any"
                                        placeholder={t('investments.price')}
                                        value={priceInputs[h.id] ?? h.currentPrice ?? ''}
                                        onChange={(e) => handlePriceInputChange(h.id, e.target.value)}
                                        onBlur={() => handleUpdatePrice(h)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        className="bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm w-full min-w-[50px] max-w-24 focus:ring-1 focus:ring-indigo-500 focus:outline-none appearance-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="hidden md:flex items-center gap-3">
                                      <span className="text-xs font-semibold bg-gray-600 text-gray-300 px-2 py-1 rounded-md">{t(`investmentTypes.${h.investmentType}`)}</span>
                                      {['Stock', 'ETF'].includes(h.investmentType) && (
                                          <input
                                              id={`isin-desktop-${h.id}`}
                                              type="text"
                                              value={h.isin || ''}
                                              onChange={(e) => updateInvestmentHolding({ ...h, isin: e.target.value, isinVerified: false })}
                                              placeholder={t('investments.isin_placeholder')}
                                              maxLength={12}
                                              className="bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm w-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                          />
                                      )}
                                    </div>
                                    <button onClick={() => setModalState({ isOpen: true, holding: h })} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-md transition-colors flex-shrink-0">
                                        {t('investments.transaction')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 md:hidden">
                              <span className="text-xs font-semibold bg-gray-600 text-gray-300 px-2 py-1 rounded-md">{t(`investmentTypes.${h.investmentType}`)}</span>
                              {['Stock', 'ETF'].includes(h.investmentType) && (
                                  <input
                                      id={`isin-mobile-${h.id}`}
                                      type="text"
                                      value={h.isin || ''}
                                      onChange={(e) => updateInvestmentHolding({ ...h, isin: e.target.value, isinVerified: false })}
                                      placeholder={t('investments.isin_placeholder')}
                                      maxLength={12}
                                      className="bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm w-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  />
                              )}
                            </div>


                            {/* Main Stats */}
                            {h.quantity > 0 && (
                                <div className="grid grid-cols-3 text-center divide-x divide-gray-600">
                                    <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.quantity_short')}</p>
                                        <p className="font-semibold text-gray-100">{h.quantity.toFixed(4)}</p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.marketValue_short')}</p>
                                        <p className="font-semibold text-gray-100">{getCurrencySymbol(h.currency)}{marketValue.toFixed(2)}</p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.allocation')}</p>
                                        <p className="font-semibold text-gray-100">{h.allocationPercentage.toFixed(1)}%</p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Performance Stats */}
                            {h.quantity > 0 && (
                                <div className="grid grid-cols-3 text-center divide-x divide-gray-600 pt-4 border-t border-gray-600">
                                     <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.costBasis')}</p>
                                        <p className="font-semibold text-gray-100">{getCurrencySymbol(h.currency)}{h.costBasis.toFixed(2)}</p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.pl_short')}</p>
                                        <p className={`font-semibold ${plColor}`}>
                                            {sign}{getCurrencySymbol(h.currency)}{h.totalReturn.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('investments.pl_percentage')}</p>
                                        <p className={`font-semibold ${plColor}`}>
                                            {sign}{h.returnPercentage.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }) : <p className="text-gray-400 text-center py-4">{t('investments.noHoldings')}</p>}
            </div>

             <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">{t('investments.recentTransactions')}</h2>
                <ul className="space-y-3">
                    {recentTransactions.length > 0 ? recentTransactions.map(transaction => {
                        const holding = getHolding(transaction.holdingId);
                        const typeColors = {
                            BUY: { bg: 'bg-green-500/20', text: 'text-red-400' },
                            SELL: { bg: 'bg-red-500/20', text: 'text-green-400' },
                            DIVIDEND: { bg: 'bg-blue-500/20', text: 'text-green-400' },
                        };
                        const color = typeColors[transaction.type];
                        return (
                            <li key={transaction.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${color.bg}`}>
                                        {transaction.type === 'BUY' ? <ArrowDownIcon className={color.text}/> : <ArrowUpIcon className={color.text}/>}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-100">{t(`investmentTransactionTypes.${transaction.type}`)} {holding?.ticker}</p>
                                        <p className="text-xs text-gray-400">{getAccountName(transaction.accountId)} &middot; {new Date(transaction.date).toLocaleDateString(locale)}</p>
                                    </div>
                                </div>
                                <span className={`font-semibold ${color.text}`}>
                                    {transaction.type === 'BUY' ? '-' : '+'}{holding ? getCurrencySymbol(holding.currency) : ''}{transaction.totalAmount.toFixed(2)}
                                </span>
                            </li>
                        )
                    }) : <p className="text-gray-400 text-center py-4">{t('investments.noTransactions')}</p>}
                </ul>
            </div>
        </div>
    );
};

export default Investments;