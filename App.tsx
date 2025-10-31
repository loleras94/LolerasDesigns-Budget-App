// Trigger redeploy

import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import QuickAdd from './components/QuickAdd';
import Accounts from './components/Accounts';
import Investments from './components/Investments';
import History from './components/History';
import { ChartPieIcon, PlusCircleIcon, BanknotesIcon, BriefcaseIcon, HistoryIcon } from './components/Icons';
import { useLanguage } from './context/LanguageContext';

type Tab = 'dashboard' | 'add' | 'accounts' | 'investments' | 'history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { t } = useLanguage();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'add':
        return <QuickAdd setActiveTab={setActiveTab}/>;
      case 'accounts':
        return <Accounts />;
      case 'investments':
        return <Investments />;
      case 'history':
        return <History />;
      default:
        return <Dashboard />;
    }
  };

  const NavItem: React.FC<{ tab: Tab; icon: React.ReactNode; label: string }> = ({ tab, icon, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
        activeTab === tab ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-300'
      }`}
    >
      {icon}
      <span className="text-xs mt-1 text-center">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
       <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10 flex justify-center items-center">
        <h1 className="text-2xl font-bold text-center text-indigo-400 whitespace-nowrap">{t('appName')}</h1>
      </header>

      <main className="flex-grow p-4 md:p-6 mb-16">
        {renderContent()}
      </main>

      <nav className="fixed-bottom-nav bg-gray-800 border-t border-gray-700 flex justify-around shadow-lg">
        <NavItem tab="dashboard" icon={<ChartPieIcon />} label={t('nav.dashboard')} />
        <NavItem tab="add" icon={<PlusCircleIcon />} label={t('nav.quickAdd')} />
        <NavItem tab="accounts" icon={<BanknotesIcon />} label={t('nav.accounts')} />
        <NavItem tab="investments" icon={<BriefcaseIcon />} label={t('nav.investments')} />
        <NavItem tab="history" icon={<HistoryIcon />} label={t('nav.history')} />
      </nav>

    </div>
  );
};

export default App;