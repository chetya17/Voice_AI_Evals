import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  isApiKeySet: boolean;
  clearApiKey: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

interface ApiKeyProviderProps {
  children: ReactNode;
}

export const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>('');

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    // Optionally store in localStorage for persistence
    if (key) {
      localStorage.setItem('chatbot-api-key', key);
    } else {
      localStorage.removeItem('chatbot-api-key');
    }
  };

  const clearApiKey = () => {
    setApiKeyState('');
    localStorage.removeItem('chatbot-api-key');
  };

  // Load API key from localStorage on component mount
  React.useEffect(() => {
    const storedKey = localStorage.getItem('chatbot-api-key');
    if (storedKey) {
      setApiKeyState(storedKey);
    }
  }, []);

  const value: ApiKeyContextType = {
    apiKey,
    setApiKey,
    isApiKeySet: !!apiKey.trim(),
    clearApiKey,
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};
