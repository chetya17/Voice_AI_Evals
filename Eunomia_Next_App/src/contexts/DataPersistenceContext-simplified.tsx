import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

// Simplified data interfaces - only essential data
export interface TestConfig {
  agentDescription: string; // Agent description entered by user
  testCases: number; // Number of test cases to generate
  conversationTurns: number; // Number of conversation turns
  conversationMode?: 'fixed' | 'range' | 'auto';
  conversationRange?: { min: number; max: number };
  endpointUrl: string; // Remote agent endpoint
  endpointApiKey?: string;
  useCorsProxy?: boolean;
  authorizationToken?: string;
  extractedHeaders?: Record<string, string>;
  extractedCookies?: Record<string, string>;
  timestamp: Date;
}

export interface ScoringMetric {
  metricId: string;
  name: string;
  description: string;
  totalPoints: number;
  rubrics: ScoringRubric[];
  source: 'generated' | 'user_added';
}

export interface ScoringRubric {
  criterion: string;
  points: number;
  description: string;
}

export interface TestCase {
  testCaseId: string;
  content: string;
  source: 'generated' | 'user_created' | 'csv_uploaded';
  csvFileName?: string;
}

export interface Guideline {
  guidelineId: string;
  type: 'test_case' | 'scoring' | 'simulation';
  content: string;
  isEdited: boolean;
  originalContent?: string;
}

export interface ConversationMessage {
  messageId: string;
  role: 'user_query' | 'remote_agent_response'; // Clear labels as requested
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SimulatedConversation {
  conversationId: string;
  testCaseId: string;
  testCase: string; // For display purposes
  messages: ConversationMessage[];
  completed: boolean;
}

export interface MetricScore {
  metricId: string;
  metricName: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  isNotApplicable: boolean;
  timestamp: Date;
}

export interface ConversationScore {
  conversationId: string;
  testCaseId: string;
  testCase: string; // For display purposes
  metricScores: MetricScore[];
  overallScore: number;
}

export interface OverallScores {
  metricOverallScores: Array<{
    metricId: string;
    metricName: string;
    averageScore: number;
    totalConversations: number;
    notApplicableCount: number;
    minScore: number;
    maxScore: number;
    standardDeviation: number;
  }>;
  sessionOverallScore: number;
  totalConversations: number;
  totalMetrics: number;
}

export interface EvaluationSession {
  id: string;
  name: string;
  agentDescription: string;
  testConfig: TestConfig;
  testCases: TestCase[];
  scoringMetrics: ScoringMetric[];
  guidelines: Guideline[];
  simulatedConversations: SimulatedConversation[];
  conversationScores: ConversationScore[];
  overallScores?: OverallScores;
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
  createNewSession: (name: string, agentDescription: string) => Promise<void>;
  updateTestConfig: (config: TestConfig) => Promise<void>;
  updateTestCases: (testCases: TestCase[]) => Promise<void>;
  updateScoringMetrics: (metrics: ScoringMetric[]) => Promise<void>;
  updateGuidelines: (guidelines: Guideline[]) => Promise<void>;
  updateSimulatedConversations: (conversations: SimulatedConversation[]) => Promise<void>;
  updateConversationScores: (scores: ConversationScore[]) => Promise<void>;
  updateOverallScores: (scores: OverallScores) => Promise<void>;
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
  // Mock user for now - replace with actual auth when available
  const user = { id: 'mock-user-id', username: 'mock-username' };
  const isAuthenticated = true;
  
  const [currentSession, setCurrentSession] = useState<EvaluationSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<EvaluationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<EvaluationSession | null>(null);

  // Load saved sessions from MongoDB on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSessionsFromMongoDB();
    } else {
      // Clear data when user logs out
      clearAllData();
    }
  }, [isAuthenticated, user?.id]);

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
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.success) {
        // Load complete session data for each session
        const sessionsWithCompleteData = await Promise.all(
          data.data.map(async (session: any) => {
            try {
              // Load complete session data including all related data
              const sessionResponse = await fetch(`/api/sessions/${session._id}`);
              const sessionData = await sessionResponse.json();
              
              if (sessionData.success) {
                const completeSession = sessionData.data;
                
                // Convert MongoDB session data to EvaluationSession format
                return {
                  id: completeSession.session._id,
                  name: completeSession.session.name,
                  agentDescription: completeSession.session.agentDescription,
                  testConfig: {
                    agentDescription: completeSession.session.agentDescription,
                    testCases: 5, // Default value
                    conversationTurns: 3, // Default value
                    endpointUrl: '', // Will be set from test config
                    timestamp: new Date()
                  },
                  testCases: completeSession.testCases || [],
                  scoringMetrics: completeSession.scoringMetrics || [],
                  guidelines: completeSession.guidelines || [],
                  simulatedConversations: completeSession.conversations || [],
                  conversationScores: completeSession.conversationScores || [],
                  overallScores: completeSession.overallScores,
                  createdAt: new Date(completeSession.session.createdAt),
                  updatedAt: new Date(completeSession.session.updatedAt),
                  status: completeSession.session.status
                };
              } else {
                // Fallback to basic session data if complete data fails to load
                return {
                  id: session._id,
                  name: session.name,
                  agentDescription: session.agentDescription || '',
                  testConfig: {
                    agentDescription: session.agentDescription || '',
                    testCases: 5,
                    conversationTurns: 3,
                    endpointUrl: '',
                    timestamp: new Date()
                  },
                  testCases: [],
                  scoringMetrics: [],
                  guidelines: [],
                  simulatedConversations: [],
                  conversationScores: [],
                  createdAt: new Date(session.createdAt),
                  updatedAt: new Date(session.updatedAt),
                  status: session.status
                };
              }
            } catch (error) {
              console.error(`Error loading complete data for session ${session._id}:`, error);
              // Return basic session data as fallback
              return {
                id: session._id,
                name: session.name,
                agentDescription: session.agentDescription || '',
                testConfig: {
                  agentDescription: session.agentDescription || '',
                  testCases: 5,
                  conversationTurns: 3,
                  endpointUrl: '',
                  timestamp: new Date()
                },
                testCases: [],
                scoringMetrics: [],
                guidelines: [],
                simulatedConversations: [],
                conversationScores: [],
                createdAt: new Date(session.createdAt),
                updatedAt: new Date(session.updatedAt),
                status: session.status
              };
            }
          })
        );
        
        setSavedSessions(sessionsWithCompleteData);
      }
    } catch (error) {
      console.error('Error loading sessions from MongoDB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async (name: string, agentDescription: string) => {
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
        agentDescription,
        testConfig: {
          agentDescription,
          testCases: 5,
          conversationTurns: 3,
          endpointUrl: '',
          timestamp: new Date()
        },
        testCases: [],
        scoringMetrics: [],
        guidelines: [],
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

  const updateTestConfig = useCallback(async (config: TestConfig) => {
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
        // Update session in MongoDB
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentDescription: config.agentDescription,
            updatedAt: new Date()
          })
        });

        if (!response.ok) {
          console.error('Failed to update session');
        }
      } catch (error) {
        console.error('Error updating test configuration:', error);
      }
    }, 1000); // 1 second debounce
    
    setUpdateTimeout(timeout);
  }, [user?.id, updateTimeout]);

  const updateTestCases = async (testCases: TestCase[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save test cases to MongoDB
      const response = await fetch('/api/test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          testCases
        })
      });

      if (!response.ok) {
        console.error('Failed to save test cases');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        testCases,
        updatedAt: new Date()
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating test cases:', error);
    }
  };

  const updateScoringMetrics = async (metrics: ScoringMetric[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save scoring metrics to MongoDB
      const response = await fetch('/api/scoring-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          metrics
        })
      });

      if (!response.ok) {
        console.error('Failed to save scoring metrics');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        scoringMetrics: metrics,
        updatedAt: new Date()
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating scoring metrics:', error);
    }
  };

  const updateGuidelines = async (guidelines: Guideline[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save guidelines to MongoDB
      const response = await fetch('/api/guidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          guidelines
        })
      });

      if (!response.ok) {
        console.error('Failed to save guidelines');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        guidelines,
        updatedAt: new Date()
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating guidelines:', error);
    }
  };

  const updateSimulatedConversations = async (conversations: SimulatedConversation[]) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save conversations to MongoDB
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          conversations
        })
      });

      if (!response.ok) {
        console.error('Failed to save conversations');
      }

      // Update session status in MongoDB
      const sessionStatus = conversations.every(conv => conv.completed) ? 'simulated' : 'configured';
      const sessionResponse = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          scores
        })
      });

      if (!response.ok) {
        console.error('Failed to save scores');
      }

      // Update session status to completed in MongoDB
      const sessionResponse = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  const updateOverallScores = async (scores: OverallScores) => {
    if (!currentSession || !user?.id) return;
    
    try {
      // Save overall scores to MongoDB
      const response = await fetch('/api/overall-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          scores
        })
      });

      if (!response.ok) {
        console.error('Failed to save overall scores');
      }

      const updatedSession: EvaluationSession = {
        ...currentSession,
        overallScores: scores,
        updatedAt: new Date()
      };
      
      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Error updating overall scores:', error);
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
        },
        body: JSON.stringify({
          name: currentSession.name,
          agentDescription: currentSession.agentDescription,
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
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        const sessionData = data.data;
        
        // Convert MongoDB session data to EvaluationSession format
        const session: EvaluationSession = {
          id: sessionData.session._id,
          name: sessionData.session.name,
          agentDescription: sessionData.session.agentDescription,
          testConfig: {
            agentDescription: sessionData.session.agentDescription,
            testCases: 5, // Default value
            conversationTurns: 3, // Default value
            endpointUrl: '', // Will be set from test config
            timestamp: new Date()
          },
          testCases: sessionData.testCases || [],
          scoringMetrics: sessionData.scoringMetrics || [],
          guidelines: sessionData.guidelines || [],
          simulatedConversations: sessionData.conversations || [],
          conversationScores: sessionData.conversationScores || [],
          overallScores: sessionData.overallScores,
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
        method: 'DELETE'
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
      const hasConfig = !!(currentSession.agentDescription && currentSession.testConfig.endpointUrl);
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
    updateTestCases,
    updateScoringMetrics,
    updateGuidelines,
    updateSimulatedConversations,
    updateConversationScores,
    updateOverallScores,
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
