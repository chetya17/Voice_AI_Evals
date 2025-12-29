import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Data interfaces
export interface TestConfig {
  chatbotType: string;
  systemPrompt: string;
  testCases: number;
  conversationTurns: number;
  customMetrics: string[];
  scoringMetrics: ScoringMetric[];
  generatedTestCases?: string[];
  timestamp: Date;
}

export interface ScoringMetric {
  name: string;
  description: string;
  totalPoints: number;
  rubrics: ScoringRubric[];
}

export interface ScoringRubric {
  criterion: string;
  points: number;
  description: string;
}

export interface SimulatedConversation {
  id: string;
  testCase: string;
  messages: ConversationMessage[];
  completed: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationScore {
  conversationId: string;
  testCase: string;
  metricScores: MetricScore[];
  averageScore: number;
}

export interface MetricScore {
  metricName: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  timestamp: Date;
  isNotApplicable?: boolean;
}

export interface EvaluationSession {
  id: string;
  name: string;
  testConfig: TestConfig;
  simulatedConversations: SimulatedConversation[];
  conversationScores: ConversationScore[];
  createdAt: Date;
  updatedAt: Date;
  status: 'configured' | 'simulated' | 'scored' | 'completed';
}

interface DataPersistenceContextType {
  // Current session data
  currentSession: EvaluationSession | null;
  
  // All saved sessions
  savedSessions: EvaluationSession[];
  
  // Actions
  createNewSession: (name: string) => void;
  updateTestConfig: (config: TestConfig) => void;
  updateSimulatedConversations: (conversations: SimulatedConversation[]) => void;
  updateConversationScores: (scores: ConversationScore[]) => void;
  saveSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  
  // Navigation helpers
  canNavigateTo: (step: string) => boolean;
  getSessionStatus: () => string;
}

const DataPersistenceContext = createContext<DataPersistenceContextType | undefined>(undefined);

const STORAGE_KEY = 'NeuroTest_evaluation_sessions';
const CURRENT_SESSION_KEY = 'NeuroTest_current_session';

export const useDataPersistence = () => {
  const context = useContext(DataPersistenceContext);
  if (context === undefined) {
    throw new Error('useDataPersistence must be used within a DataPersistenceProvider');
  }
  return context;
};

interface DataPersistenceProviderProps {
  children: ReactNode;
}

export const DataPersistenceProvider: React.FC<DataPersistenceProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<EvaluationSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<EvaluationSession[]>([]);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    loadSavedSessions();
    loadCurrentSession();
  }, []);

  const loadSavedSessions = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          testConfig: {
            ...session.testConfig,
            timestamp: new Date(session.testConfig.timestamp)
          },
          simulatedConversations: session.simulatedConversations.map((conv: any) => ({
            ...conv,
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          })),
          conversationScores: session.conversationScores.map((score: any) => ({
            ...score,
            metricScores: score.metricScores.map((ms: any) => ({
              ...ms,
              timestamp: new Date(ms.timestamp)
            }))
          }))
        }));
        setSavedSessions(sessionsWithDates);
      }
    } catch (error) {
      console.error('Error loading saved sessions:', error);
    }
  };

  const loadCurrentSession = () => {
    try {
      const saved = localStorage.getItem(CURRENT_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const sessionWithDates = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          testConfig: {
            ...parsed.testConfig,
            timestamp: new Date(parsed.testConfig.timestamp)
          },
          simulatedConversations: parsed.simulatedConversations.map((conv: any) => ({
            ...conv,
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          })),
          conversationScores: parsed.conversationScores.map((score: any) => ({
            ...score,
            metricScores: score.metricScores.map((ms: any) => ({
              ...ms,
              timestamp: new Date(ms.timestamp)
            }))
          }))
        };
        setCurrentSession(sessionWithDates);
      }
    } catch (error) {
      console.error('Error loading current session:', error);
    }
  };

  const saveToLocalStorage = (sessions: EvaluationSession[], current: EvaluationSession | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      if (current) {
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(current));
      } else {
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const createNewSession = (name: string) => {
    const newSession: EvaluationSession = {
      id: `session_${Date.now()}`,
      name,
      testConfig: {
        chatbotType: '',
        systemPrompt: '',
        testCases: 5,
        conversationTurns: 3,
        customMetrics: [],
        scoringMetrics: [],
        generatedTestCases: [],
        timestamp: new Date()
      },
      simulatedConversations: [],
      conversationScores: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'configured'
    };
    
    console.log('Creating new session:', newSession);
    setCurrentSession(newSession);
    saveToLocalStorage(savedSessions, newSession);
  };

  const updateTestConfig = (config: TestConfig) => {
    if (!currentSession) return;
    
    const updatedSession: EvaluationSession = {
      ...currentSession,
      testConfig: {
        ...config,
        timestamp: new Date()
      },
      updatedAt: new Date(),
      status: 'configured'
    };
    
    setCurrentSession(updatedSession);
    saveToLocalStorage(savedSessions, updatedSession);
  };

  const updateSimulatedConversations = (conversations: SimulatedConversation[]) => {
    if (!currentSession) return;
    
    const updatedSession: EvaluationSession = {
      ...currentSession,
      simulatedConversations: conversations,
      updatedAt: new Date(),
      status: conversations.every(conv => conv.completed) ? 'simulated' : 'configured'
    };
    
    setCurrentSession(updatedSession);
    saveToLocalStorage(savedSessions, updatedSession);
  };

  const updateConversationScores = (scores: ConversationScore[]) => {
    if (!currentSession) return;
    
    const updatedSession: EvaluationSession = {
      ...currentSession,
      conversationScores: scores,
      updatedAt: new Date(),
      status: 'completed'
    };
    
    setCurrentSession(updatedSession);
    saveToLocalStorage(savedSessions, updatedSession);
  };

  const saveSession = () => {
    if (!currentSession) return;
    
    const updatedSessions = savedSessions.filter(s => s.id !== currentSession.id);
    const newSavedSessions = [...updatedSessions, currentSession];
    
    setSavedSessions(newSavedSessions);
    saveToLocalStorage(newSavedSessions, currentSession);
  };

  const loadSession = (sessionId: string) => {
    const session = savedSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      saveToLocalStorage(savedSessions, session);
    }
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updatedSessions);
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
    
    saveToLocalStorage(updatedSessions, currentSession);
  };

  const clearCurrentSession = () => {
    setCurrentSession(null);
    localStorage.removeItem(CURRENT_SESSION_KEY);
  };

  const canNavigateTo = (step: string): boolean => {
    if (!currentSession) return false;
    
    // Dashboard is always accessible
    if (step === 'dashboard') return true;
    
    // Configure is accessible if we have a session
    if (step === 'configure') return true;
    
    // For other steps, check if we have the required data
    if (step === 'simulation') {
      return !!(currentSession.testConfig.chatbotType && currentSession.testConfig.systemPrompt);
    }
    
    if (step === 'viewer') {
      return currentSession.simulatedConversations.length > 0;
    }
    
    if (step === 'scoring') {
      return currentSession.simulatedConversations.length > 0 && 
             currentSession.simulatedConversations.every(conv => conv.completed);
    }
    
    if (step === 'results') {
      return currentSession.conversationScores.length > 0;
    }
    
    return false;
  };

  const getSessionStatus = (): string => {
    if (!currentSession) return 'No active session';
    return currentSession.status.charAt(0).toUpperCase() + currentSession.status.slice(1);
  };

  const value: DataPersistenceContextType = {
    currentSession,
    savedSessions,
    createNewSession,
    updateTestConfig,
    updateSimulatedConversations,
    updateConversationScores,
    saveSession,
    loadSession,
    deleteSession,
    clearCurrentSession,
    canNavigateTo,
    getSessionStatus
  };

  return (
    <DataPersistenceContext.Provider value={value}>
      {children}
    </DataPersistenceContext.Provider>
  );
};
