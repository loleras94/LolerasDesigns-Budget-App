import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

type Language = 'en' | 'el';

// Default empty translations, will be populated asynchronously
const defaultTranslations: Record<Language, any> = {
    en: {},
    el: {}
};

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Function to resolve nested keys like 'nav.dashboard'
const resolve = (path: string, obj: any): string | null => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj || self);
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'en');
  const [translations, setTranslations] = useState(defaultTranslations);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchTranslations = async () => {
        try {
            const [enResponse, elResponse] = await Promise.all([
                fetch(`${import.meta.env.BASE_URL}locales/en.json`),
                fetch(`${import.meta.env.BASE_URL}locales/el.json`)
            ]);
            
            if (!enResponse.ok || !elResponse.ok) {
                throw new Error('Failed to fetch translation files');
            }

            const [enData, elData] = await Promise.all([
                enResponse.json(),
                elResponse.json()
            ]);

            setTranslations({ en: enData, el: elData });
        } catch (error) {
            console.error("Failed to load translation files", error);
            // Fallback to empty to prevent crash
            setTranslations(defaultTranslations);
        } finally {
            setIsLoaded(true);
        }
    };
    fetchTranslations();
  }, []);


  const locale = language === 'el' ? 'el-GR' : 'en-GB';

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const t = (key: string, options?: { [key: string]: string | number }): string => {
    // Fallback to English if the specific language translation is missing or not loaded yet.
    let translation = resolve(key, translations[language]) || resolve(key, translations.en); 

    if (!translation) {
      // During the initial load, translations might be empty. Return the key as a fallback.
      if (!isLoaded) {
          return key;
      }
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    if (options) {
      Object.keys(options).forEach(optKey => {
        const regex = new RegExp(`{{${optKey}}}`, 'g');
        translation = translation.replace(regex, String(options[optKey]));
      });
    }

    return translation;
  };

  // Prevent rendering children until translations are loaded to avoid UI flicker
  if (!isLoaded) {
      return null;
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
