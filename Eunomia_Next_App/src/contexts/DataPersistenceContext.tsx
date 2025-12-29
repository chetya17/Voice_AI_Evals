import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';

// Data interfaces
export interface TestConfig {
  chatbotType: string;
  systemPrompt: string;
  testCases: number;
  conversationTurns: number;
  conversationMode?: 'fixed' | 'range' | 'auto';
  conversationRange?: { min: number; max: number };
  customMetrics: string[];
  scoringMetrics: ScoringMetric[];
  generatedTestCases?: string[];
  uploadedTestCases?: string[];
  csvFileName?: string;
  useUploadedTestCases?: boolean;
  timestamp: Date;
  
  // Remote agent configuration fields
  chatbotMode: 'endpoint';
  endpointUrl: string;
  endpointApiKey?: string;
  isEndpointValid?: boolean;
  useCorsProxy?: boolean;
  authorizationToken?: string;
  extractedHeaders?: Record<string, string>;
  extractedCookies?: Record<string, string>;
  
  // Agent type configuration
  agentType?: string;
  guidelines?: {
    testCaseGuideline: string;
    scoringGuideline: string;
    simulationGuideline: string;
  };
  
  // RAG evaluation configuration
  evaluationMode?: 'non-rag' | 'rag' | 'both';
  uploadedDocuments?: Array<{
    documentId: string;
    fileName: string;
    chunkCount: number;
  }>;
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
  metadata?: Record<string, any>;
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
  agentDescription?: string;
  testConfig: TestConfig;
  testConfigurationId?: string; // Add this to track the test config ID
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
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  createNewSession: (name: string, agentDescription?: string) => Promise<void>;
  updateTestConfig: (config: TestConfig) => Promise<void>;
  updateSimulatedConversations: (conversations: SimulatedConversation[]) => Promise<void>;
  updateConversationScores: (scores: ConversationScore[]) => Promise<void>;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearCurrentSession: () => void;
  clearAllData: () => void;
  clearCurrentSessionForNewEval: () => Promise<void>;
  
  // Navigation helpers
  canNavigateTo: (step: string) => boolean;
  getSessionStatus: () => string;
}

const DataPersistenceContext = createContext<DataPersistenceContextType | undefined>(undefined);

// Removed localStorage constants - now using MongoDB exclusively

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
  // Generate a unique user ID for this session
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [currentSession, setCurrentSession] = useState<EvaluationSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<EvaluationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<EvaluationSession | null>(null);

  // Initialize user on mount
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Try to get existing user ID from localStorage
        let userId = localStorage.getItem('user-id');
        
        if (!userId) {
          // Generate a new unique user ID
          userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('user-id', userId);
        }
        
        setUser({ id: userId });
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error initializing user:', error);
        // Fallback to a session-based ID
        const fallbackId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setUser({ id: fallbackId });
        setIsAuthenticated(true);
      }
    };
    
    initializeUser();
  }, []);

  // Load saved sessions from MongoDB on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSessionsFromMongoDB();
    } else {
      // Clear data when user logs out
      clearAllData();
    }
  }, [isAuthenticated, user?.id]); // Only depend on user.id to prevent excessive calls

  // Update ref when currentSession changes
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, [updateTimeout]);

  const loadSessionsFromMongoDB = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch complete session data including conversations and scores
      const response = await fetch('/api/sessions/complete', {
        headers: {
          'x-user-id': user.id
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Map the complete session data to EvaluationSession format
        const completeSessions = data.data.map((session: any) => ({
          id: session.id,
          name: session.name,
          agentDescription: session.agentDescription,
          testConfig: session.testConfig || {
            chatbotType: '',
            systemPrompt: '',
            testCases: 5,
            conversationTurns: 3,
            customMetrics: [],
            scoringMetrics: [],
            generatedTestCases: [],
            chatbotMode: 'endpoint' as const,
            endpointUrl: '',
            timestamp: new Date()
          },
          simulatedConversations: session.simulatedConversations || [],
          conversationScores: session.conversationScores || [],
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          status: session.status
        }));
        
        setSavedSessions(completeSessions);
      }
    } catch (error) {
      console.error('Error loading sessions from MongoDB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed localStorage fallback functions - now using MongoDB exclusively

  const createNewSession = async (name: string, agentDescription: string = '') => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Create session in MongoDB
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          name,
          agentDescription
        })
      });

      const sessionData = await sessionResponse.json();
      if (!sessionData.success) {
        throw new Error('Failed to create session');
      }

      const newSession: EvaluationSession = {
        id: sessionData.data._id,
        name,
        agentDescription: agentDescription || '',
        testConfig: {
          chatbotType: '',
          systemPrompt: '',
          testCases: 5,
          conversationTurns: 3,
          customMetrics: [],
          scoringMetrics: [],
          generatedTestCases: [],
          chatbotMode: 'endpoint' as const,
          endpointUrl: '',
          timestamp: new Date()
        },
        simulatedConversations: [],
        conversationScores: [],
        createdAt: new Date(sessionData.data.createdAt),
        updatedAt: new Date(sessionData.data.updatedAt),
        status: 'configured'
      };
      
      console.log('Creating new session:', newSession);
      setCurrentSession(newSession);
      
      // Reload sessions from MongoDB
      await loadSessionsFromMongoDB();
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const updateTestConfig = useCallback(async (config: Omit<TestConfig, 'apiKey'>) => {
    const session = currentSessionRef.current;
    if (!session || !user?.id) return;
    
    // Clear any existing timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    // Update local state immediately for UI responsiveness
    const updatedSession: EvaluationSession = {
      ...session,
      testConfig: {
        ...config,
        timestamp: new Date()
      },
      updatedAt: new Date(),
      status: 'configured'
    };
    
    setCurrentSession(updatedSession);
    
    // Debounce the API call
    const timeout = setTimeout(async () => {
      try {
        // Use the test configuration ID if available, otherwise fall back to session ID
        const configId = updatedSession.testConfigurationId || updatedSession.id;
        
        // Update test configuration in MongoDB
        const response = await fetch(`/api/test-configurations/${configId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({
            ...config,
            timestamp: new Date()
          })
        });

        const data = await response.json();
        if (!data.success) {
          // If configuration not found, try to create a new one
          if (response.status === 404) {
            console.log('Test configuration not found, creating new one...');
            const createResponse = await fetch('/api/test-configurations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              },
              body: JSON.stringify({
                sessionId: updatedSession.id,
                ...config,
                timestamp: new Date()
              })
            });
            
            const createData = await createResponse.json();
            if (createData.success) {
              // Update the session with the new test configuration ID
              setCurrentSession(prev => prev ? {
                ...prev,
                testConfigurationId: createData.data._id
              } : null);
            }
          } else {
            console.error('Failed to update test configuration:', data.error);
          }
        }
      } catch (error) {
        console.error('Error updating test configuration:', error);
      }
    }, 1000); // 1 second debounce
    
    setUpdateTimeout(timeout);
  }, [user?.id, updateTimeout]); // Remove currentSession from dependencies to prevent infinite loops

  const updateSimulatedConversations = async (conversations: SimulatedConversation[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save conversations to MongoDB
      for (const conversation of conversations) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({
            sessionId: currentSession.id,
            conversationId: conversation.id,
            testCase: conversation.testCase,
            messages: conversation.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            })),
            completed: conversation.completed
          })
        });

        if (!response.ok) {
          console.error('Failed to save conversation:', conversation.id);
        }
      }

      // Update session status in MongoDB
      const sessionStatus = conversations.every(conv => conv.completed) ? 'simulated' : 'configured';
      const sessionResponse = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          status: sessionStatus,
          updatedAt: new Date()
        })
      });

      if (!sessionResponse.ok) {
        console.error('Failed to update session status');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        simulatedConversations: conversations,
        updatedAt: new Date(),
        status: sessionStatus
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating simulated conversations:', error);
    }
  };

  const updateConversationScores = async (scores: ConversationScore[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save scores to MongoDB
      for (const score of scores) {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify({
            sessionId: currentSession.id,
            conversationId: score.conversationId,
            testCase: score.testCase,
            metricScores: score.metricScores.map(metric => ({
              metricName: metric.metricName,
              score: metric.score,
              maxScore: metric.maxScore,
              feedback: metric.feedback,
              isNotApplicable: metric.isNotApplicable || false,
              timestamp: metric.timestamp
            })),
            averageScore: score.averageScore
          })
        });

        if (!response.ok) {
          console.error('Failed to save score:', score.conversationId);
        }
      }

      // Update session status to completed in MongoDB
      const sessionResponse = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          status: 'completed',
          updatedAt: new Date()
        })
      });

      if (!sessionResponse.ok) {
        console.error('Failed to update session status to completed');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        conversationScores: scores,
        updatedAt: new Date(),
        status: 'completed'
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating conversation scores:', error);
    }
  };

  const saveSession = async () => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Update session in MongoDB
      const response = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          name: currentSession.name,
          status: currentSession.status,
          updatedAt: new Date()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      // Update local state
      const updatedSessions = savedSessions.filter(s => s.id !== currentSession.id);
      const newSavedSessions = [...updatedSessions, currentSession];
      
      setSavedSessions(newSavedSessions);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        headers: {
          'x-user-id': user?.id || 'unknown'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const sessionData = data.data;
        
        // Convert MongoDB session data to EvaluationSession format
        const session: EvaluationSession = {
          id: sessionData.session._id,
          name: sessionData.session.name,
          testConfigurationId: sessionData.testConfiguration?._id, // Store the test config ID
          testConfig: sessionData.testConfiguration ? {
            chatbotType: sessionData.testConfiguration.chatbotType || '',
            systemPrompt: sessionData.testConfiguration.systemPrompt || '',
            testCases: sessionData.testConfiguration.testCases || 5,
            conversationTurns: sessionData.testConfiguration.conversationTurns || 3,
            customMetrics: sessionData.testConfiguration.customMetrics || [],
            scoringMetrics: sessionData.testConfiguration.scoringMetrics || [],
            generatedTestCases: sessionData.testConfiguration.generatedTestCases || [],
            chatbotMode: 'endpoint' as const,
            endpointUrl: sessionData.testConfiguration.endpointUrl || '',
            timestamp: new Date(sessionData.testConfiguration.timestamp)
          } : {
            chatbotType: '',
            systemPrompt: '',
            testCases: 5,
            conversationTurns: 3,
            customMetrics: [],
            scoringMetrics: [],
            generatedTestCases: [],
            chatbotMode: 'endpoint' as const,
            endpointUrl: '',
            timestamp: new Date()
          },
          simulatedConversations: sessionData.simulatedConversations || [],
          conversationScores: sessionData.conversationScores || [],
          createdAt: new Date(sessionData.session.createdAt),
          updatedAt: new Date(sessionData.session.updatedAt),
          status: sessionData.session.status
        };
        
        setCurrentSession(session);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || 'unknown'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
      setSavedSessions(updatedSessions);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const clearCurrentSession = () => {
    setCurrentSession(null);
  };

  const clearAllData = () => {
    console.log('DataPersistence: Clearing all data');
    setCurrentSession(null);
    setSavedSessions([]);
    console.log('DataPersistence: All data cleared');
  };

  const clearCurrentSessionForNewEval = async () => {
    console.log('DataPersistence: Clearing current session for new evaluation');
    // Save current session to savedSessions if it has results
    if (currentSession && currentSession.conversationScores.length > 0) {
      console.log('DataPersistence: Saving current session with results to savedSessions');
      await saveSession();
    }
    
    // Clear current session
    setCurrentSession(null);
    console.log('DataPersistence: Current session cleared, saved sessions preserved');
  };

  const canNavigateTo = useCallback((step: string): boolean => {
    if (!currentSession) {
      return false;
    }
    
    // Dashboard is always accessible
    if (step === 'dashboard') {
      return true;
    }
    
    // Configure is accessible if we have a session
    if (step === 'configure') {
      return true;
    }
    
    // For other steps, check if we have the required data
    if (step === 'simulation') {
      const hasConfig = !!(currentSession.testConfig.chatbotType && currentSession.testConfig.systemPrompt);
      return hasConfig;
    }
    
    if (step === 'viewer') {
      const hasConversations = currentSession.simulatedConversations.length > 0;
      return hasConversations;
    }
    
    if (step === 'scoring') {
      const hasCompletedConversations = currentSession.simulatedConversations.length > 0 && 
             currentSession.simulatedConversations.every(conv => conv.completed);
      return hasCompletedConversations;
    }
    
    if (step === 'results') {
      const hasScores = currentSession.conversationScores.length > 0;
      return hasScores;
    }
    
    return false;
  }, [currentSession]);

  const getSessionStatus = (): string => {
    if (!currentSession) return 'No active session';
    return currentSession.status.charAt(0).toUpperCase() + currentSession.status.slice(1);
  };

  const value: DataPersistenceContextType = {
    currentSession,
    savedSessions,
    isLoading,
    createNewSession,
    updateTestConfig,
    updateSimulatedConversations,
    updateConversationScores,
    saveSession,
    loadSession,
    deleteSession,
    clearCurrentSession,
    clearAllData,
    clearCurrentSessionForNewEval,
    canNavigateTo,
    getSessionStatus
  };

  return (
    <DataPersistenceContext.Provider value={value}>
      {children}
    </DataPersistenceContext.Provider>
  );
};
