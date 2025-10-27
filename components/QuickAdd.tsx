import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Transaction, TransactionType, CostCategory, MustSubCategory, WantsSubCategory, DetailCategory, IncomeType, CustomCategories } from '../types';
import { CATEGORIES } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import CustomSelect from './CustomSelect';

interface QuickAddProps {
  setActiveTab: (tab: 'dashboard' | 'add' | 'budget' | 'accounts') => void;
}

// Helper function to get display name (handles translation for predefined, returns key for custom)
const getOptionDisplayName = (key: string, type: 'subCategory' | 'detail', category: CostCategory | '', t: (key: string) => string, subCategory?: string) => {
    if (!category) return key;

    let isPredefined = false;
    if (type === 'subCategory') {
        isPredefined = Object.prototype.hasOwnProperty.call(CATEGORIES[category].subCategories, key);
    } else if (type === 'detail' && subCategory) {
        const predefinedSubCat = (CATEGORIES[category].subCategories as any)[subCategory];
        isPredefined = predefinedSubCat && predefinedSubCat.includes(key);
    }

    // Custom items are not translated
    if (!isPredefined) {
        return key;
    }
    
    // Predefined items are translated
    return t(type === 'subCategory' ? `subCategories.${key}` : `details.${key}`);
};

const QuickAdd: React.FC<QuickAddProps> = ({ setActiveTab }) => {
  const { addTransaction, accounts, getCurrencySymbol, customCategories, addCustomDetail, addCustomSubCategory } = useAppContext();
  const { t } = useLanguage();
  
  const [type, setType] = useState<TransactionType>(TransactionType.COST);
  const [incomeType, setIncomeType] = useState<IncomeType>(IncomeType.WORK);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CostCategory | ''>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [detail, setDetail] = useState<DetailCategory | string | ''>('');
  const [error, setError] = useState<string>('');
  const [subCategoryMenuOpen, setSubCategoryMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);
  
  const selectedAccountCurrencySymbol = useMemo(() => {
      if (!accountId) return '';
      const account = accounts.find(a => a.id === accountId);
      return account ? getCurrencySymbol(account.currency) : '';
  }, [accountId, accounts, getCurrencySymbol]);

  const subCategoryOptions = useMemo(() => {
    if (!category) return [];

    // FIX: Add explicit string type for filter callback argument to fix "Argument of type 'unknown'" error.
    const predefined = Object.keys(CATEGORIES[category].subCategories).filter((sc: string) => sc !== 'OTHER');
    const custom = customCategories[category]?.newSubCategories || [];
    
    // Ensure custom subs are unique and not already in predefined
    // FIX: Add explicit string type for filter callback argument to fix "Argument of type 'unknown'" error.
    const uniqueCustom = [...new Set(custom)].filter((c: string) => !predefined.includes(c));

    // Sort predefined by translated names, sort custom alphabetically
    // FIX: Add explicit string types for sort callback arguments to fix "Argument of type 'unknown'" error.
    const sortedPredefined = [...predefined].sort((a: string, b: string) => t(`subCategories.${a}`).localeCompare(t(`subCategories.${b}`)));
    // FIX: Add explicit string types for sort callback arguments to fix "Argument of type 'unknown'" error.
    const sortedCustom = [...uniqueCustom].sort((a: string, b: string) => a.localeCompare(b));
    
    return [...sortedPredefined, ...sortedCustom, 'OTHER'];
  }, [category, customCategories, t]);

  // Helper function to calculate detail options based on the current category and a given subcategory
  const getDetailOptionsForSubCategory = (currentSubCategory: string): string[] => {
    if (!category || !currentSubCategory) return [];

    // Get predefined details, excluding 'OTHER'
    const predefinedDetails = ((CATEGORIES[category]?.subCategories as any)[currentSubCategory] || []).filter((d: string) => d !== 'OTHER');
    
    // Get custom details
    const customDetails = customCategories[category]?.subCategories?.[currentSubCategory] || [];
    
    // Ensure custom details are unique and not already in predefined
    const uniqueCustom = [...new Set(customDetails)].filter((d: string) => !predefinedDetails.includes(d));

    // FIX: Add explicit string types for sort callback arguments to fix "Argument of type 'unknown'" error.
    const sortedPredefined = [...predefinedDetails].sort((a: string, b: string) => t(`details.${a}`).localeCompare(t(`details.${b}`)));
    const sortedCustom = [...uniqueCustom].sort((a: string, b: string) => a.localeCompare(b));
    
    const finalOptions = [...sortedPredefined, ...sortedCustom];
    
    // Check if original predefined subcategory has an 'OTHER' option.
    const originalSubCatHasOther = ((CATEGORIES[category]?.subCategories as any)[currentSubCategory] || []).includes('OTHER');

    // A custom subcategory that isn't predefined should always have an OTHER option for details.
    const isCustomSubCategory = !Object.prototype.hasOwnProperty.call(CATEGORIES[category].subCategories, currentSubCategory) && (customCategories[category]?.newSubCategories || []).includes(currentSubCategory);

    if (originalSubCatHasOther || isCustomSubCategory) {
        if (!finalOptions.includes('OTHER')) {
           finalOptions.push('OTHER');
        }
    }

    // If a subcategory has been selected, but there are no details (e.g. brand new custom sub), return just ['OTHER']
    if (finalOptions.length === 0 && currentSubCategory) {
        return ['OTHER'];
    }
    
    return finalOptions;
  };

  const detailOptions = useMemo(() => {
    return getDetailOptionsForSubCategory(subCategory);
  }, [category, subCategory, customCategories, t]);

  // Auto-select detail if 'OTHER' is the only option
  useEffect(() => {
    if (subCategory && category) {
      if (detailOptions.length === 1 && detailOptions[0] === 'OTHER') {
        setDetail('OTHER');
      }
    }
  }, [subCategory, category, detailOptions]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setIncomeType(IncomeType.WORK);
    setCategory('');
    setSubCategory('');
    setDetail('');
    setDescription('');
    setNewSubCategoryName('');
    setSubCategoryMenuOpen(false);
    setDetailMenuOpen(false);
  };

  const handleCategorySelect = (selectedCategory: CostCategory) => {
    // Allow deselecting by clicking the same button again
    if (category === selectedCategory) {
        setCategory('');
        setSubCategory('');
        setDetail('');
        setSubCategoryMenuOpen(false);
    } else {
        setCategory(selectedCategory);
        setSubCategory('');
        setDetail('');
        setSubCategoryMenuOpen(true);
        setDetailMenuOpen(false);
    }
    setNewSubCategoryName('');
  };
  
  const handleSubCategoryChange = (value: string) => {
    setSubCategory(value);
    setDetail('');
    setNewSubCategoryName('');
    
    // Immediately calculate new options to avoid stale state and decide if the menu should open
    const newDetailOptions = getDetailOptionsForSubCategory(value);
    if (value && newDetailOptions.length > 1) {
        setDetailMenuOpen(true);
    } else {
        setDetailMenuOpen(false);
    }
  };

  const isDescriptionVisible = type === TransactionType.INCOME || (type === TransactionType.COST && detail === 'OTHER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !date || !accountId) {
      setError(t('quickAdd.errorRequired'));
      return;
    }

    if (type === TransactionType.COST) {
        if (!category || !subCategory) {
            setError(t('quickAdd.errorCategory'));
            return;
        }

        const isNewSubCategory = subCategory === 'OTHER';
        if (isNewSubCategory && !newSubCategoryName.trim()) {
            setError(t('quickAdd.errorNewSubcategory'));
            return;
        }

        const finalSubCategory = isNewSubCategory ? newSubCategoryName.trim() : subCategory;

        if (!detail) {
            setError(t('quickAdd.errorDetail'));
            return;
        }
        
        const isOtherDetail = detail === 'OTHER';
        if (isOtherDetail && !description.trim()) {
            setError(t('quickAdd.errorOtherDescription'));
            return;
        }

        const finalDetail = isOtherDetail ? description.trim() : detail;

        addTransaction({
            type,
            amount: parseFloat(amount),
            date,
            accountId,
            description: finalDetail,
            category: category as CostCategory,
            subCategory: finalSubCategory,
            detail: finalDetail,
        });

        if (isNewSubCategory) {
            addCustomSubCategory(category, finalSubCategory);
        }

        if (isOtherDetail) {
            addCustomDetail(category, finalSubCategory, finalDetail);
        }

    } else { // INCOME
        if (!description.trim()) {
            setError(t('quickAdd.errorIncomeDescription'));
            return;
        }

        addTransaction({
            type,
            amount: parseFloat(amount),
            date,
            accountId,
            description: description.trim(),
            incomeType: incomeType,
        });
    }

    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setSubCategory('');
    setNewSubCategoryName('');
    setDetail('');
    setError('');
    setActiveTab('dashboard');
  };

  const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
  const labelClasses = "block text-sm font-medium text-gray-300 mb-1";
  
  const mappedSubCategoryOptions = subCategoryOptions.map(sc => ({
    value: sc,
    label: getOptionDisplayName(sc, 'subCategory', category, t)
  }));
  
  const mappedDetailOptions = detailOptions.map(d => ({
    value: d,
    label: getOptionDisplayName(d, 'detail', category, t, subCategory)
  }));
  
  const descriptionPlaceholder = useMemo(() => {
    if (type === TransactionType.COST) return t('quickAdd.descriptionCostPlaceholder');
    if (incomeType === IncomeType.WORK) return t('quickAdd.workIncomePlaceholder');
    return t('quickAdd.descriptionIncomePlaceholder');
  }, [type, incomeType, t]);

  const formatDateForDisplay = (isoDate: string) => {
    if (!isoDate) return 'DD/MM/YYYY';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-center mb-6 text-gray-100">{t('quickAdd.title')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex bg-gray-700 p-1 rounded-lg">
          <button type="button" onClick={() => handleTypeChange(TransactionType.COST)} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${type === TransactionType.COST ? 'bg-red-500 text-white' : 'text-gray-300'}`}>{t('quickAdd.cost')}</button>
          <button type="button" onClick={() => handleTypeChange(TransactionType.INCOME)} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${type === TransactionType.INCOME ? 'bg-green-500 text-white' : 'text-gray-300'}`}>{t('quickAdd.income')}</button>
        </div>

        {type === TransactionType.INCOME && (
            <div className="flex bg-gray-700 p-1 rounded-lg">
              <button
                  type="button"
                  onClick={() => setIncomeType(IncomeType.WORK)}
                  className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${incomeType === IncomeType.WORK ? 'bg-blue-500 text-white' : 'text-gray-300'}`}
              >
                  {t('quickAdd.workIncome')}
              </button>
              <button
                  type="button"
                  onClick={() => setIncomeType(IncomeType.EXTRA)}
                  className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${incomeType === IncomeType.EXTRA ? 'bg-teal-500 text-white' : 'text-gray-300'}`}
              >
                  {t('quickAdd.extraIncome')}
              </button>
            </div>
        )}

        {type === TransactionType.COST && (
            <div className="flex bg-gray-700 p-1 rounded-lg">
              <button
                  type="button"
                  onClick={() => handleCategorySelect(CostCategory.MUST)}
                  className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${category === CostCategory.MUST ? 'bg-orange-500 text-white' : 'text-gray-300'}`}
              >
                  {t('quickAdd.must')}
              </button>
              <button
                  type="button"
                  onClick={() => handleCategorySelect(CostCategory.WANTS)}
                  className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${category === CostCategory.WANTS ? 'bg-sky-500 text-white' : 'text-gray-300'}`}
              >
                  {t('quickAdd.wants')}
              </button>
            </div>
        )}

        {type === TransactionType.COST && category && (
          <div className="space-y-4">
              {subCategoryOptions.length > 0 ? (
                <div>
                  <label htmlFor="subCategory" className={labelClasses}>
                    {category ? t('quickAdd.subCategoryFor', { category: t(`costCategories.${category}`) }) : t('quickAdd.subcategory')}
                  </label>
                  <CustomSelect
                    id="subCategory"
                    options={mappedSubCategoryOptions}
                    value={subCategory}
                    onChange={handleSubCategoryChange}
                    placeholder={t('quickAdd.selectSubCategory')}
                    autoOpen={subCategoryMenuOpen}
                    onClose={() => setSubCategoryMenuOpen(false)}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">{t('quickAdd.noSubcategories')}</p>
              )}
              {subCategory === 'OTHER' && (
                <div>
                  <label htmlFor="newSubCategory" className={labelClasses}>{t('quickAdd.newSubCategoryName')}</label>
                  <input
                    id="newSubCategory"
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder={t('quickAdd.newSubCategoryPlaceholder')}
                    className={inputClasses}
                  />
                </div>
              )}
              {subCategory && detailOptions.length > 1 && (
                <div>
                  <label htmlFor="detail" className={labelClasses}>{t('quickAdd.detail')}</label>
                  <CustomSelect
                    id="detail"
                    options={mappedDetailOptions}
                    value={detail || ''}
                    onChange={setDetail}
                    placeholder={t('quickAdd.selectDetail')}
                    autoOpen={detailMenuOpen}
                    onClose={() => setDetailMenuOpen(false)}
                  />
                </div>
              )}
          </div>
        )}

        {isDescriptionVisible && (
            <div>
                <label htmlFor="description" className={labelClasses}>{t('quickAdd.description')}</label>
                <input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={descriptionPlaceholder}
                    className={inputClasses}
                />
            </div>
        )}
        
        <div>
            <label htmlFor="amount" className={labelClasses}>{t('quickAdd.amount')}</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{selectedAccountCurrencySymbol}</span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClasses} pl-7`}
                  step="0.01"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={labelClasses}>{t('quickAdd.date')}</label>
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
                  aria-label={t('quickAdd.date')}
                />
              </div>
            </div>
            <div>
                <label htmlFor="account" className={labelClasses}>{t('quickAdd.account')}</label>
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={inputClasses}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
            </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
          {t('quickAdd.addTransaction')}
        </button>
      </form>
    </div>
  );
};

export default QuickAdd;