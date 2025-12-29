import { 
  SessionService,
  TestCaseService,
  ConversationService,
  ConversationScoreService,
  GuidelineService,
  ScoringMetricService
} from './mongodbService';

// Interface for localStorage session data (legacy format)
interface LegacyEvaluationSession {
  id: string;
  name: string;
  testConfig: {
    chatbotType: string;
    systemPrompt: string;
    testCases: number;
    conversationTurns: number;
    conversationMode?: 'fixed' | 'range' | 'auto';
    conversationRange?: { min: number; max: number };
    customMetrics: string[];
    scoringMetrics: any[];
    generatedTestCases?: string[];
    uploadedTestCases?: string[];
    csvFileName?: string;
    useUploadedTestCases?: boolean;
    timestamp: string | Date;
    chatbotMode: 'endpoint';
    endpointUrl: string;
    endpointApiKey?: string;
    isEndpointValid?: boolean;
    useCorsProxy?: boolean;
    authorizationToken?: string;
    extractedHeaders?: Record<string, string>;
    extractedCookies?: Record<string, string>;
    agentType?: string;
    guidelines?: {
      testCaseGuideline: string;
      scoringGuideline: string;
      simulationGuideline: string;
    };
  };
  simulatedConversations: Array<{
    id: string;
    testCase: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string | Date;
      metadata?: Record<string, any>;
    }>;
    completed: boolean;
  }>;
  conversationScores: Array<{
    conversationId: string;
    testCase: string;
    metricScores: Array<{
      metricName: string;
      score: number | null;
      maxScore: number;
      feedback: string;
      timestamp: string | Date;
      isNotApplicable?: boolean;
    }>;
    averageScore: number;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
  status: 'configured' | 'simulated' | 'scored' | 'completed';
}

export class DataMigrationService {
  private static readonly STORAGE_KEY = 'NeuroTest_evaluation_sessions';
  private static readonly CURRENT_SESSION_KEY = 'NeuroTest_current_session';

  /**
   * Check if localStorage has data that needs to be migrated
   */
  static hasLocalStorageData(): boolean {
    if (typeof window === 'undefined') return false;
    
    const savedSessions = localStorage.getItem(this.STORAGE_KEY);
    const currentSession = localStorage.getItem(this.CURRENT_SESSION_KEY);
    
    return !!(savedSessions || currentSession);
  }

  /**
   * Get localStorage data for migration
   */
  static getLocalStorageData(): {
    savedSessions: LegacyEvaluationSession[];
    currentSession: LegacyEvaluationSession | null;
  } {
    if (typeof window === 'undefined') {
      return { savedSessions: [], currentSession: null };
    }

    let savedSessions: LegacyEvaluationSession[] = [];
    let currentSession: LegacyEvaluationSession | null = null;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        savedSessions = JSON.parse(saved);
      }

      const current = localStorage.getItem(this.CURRENT_SESSION_KEY);
      if (current) {
        currentSession = JSON.parse(current);
      }
    } catch (error) {
      console.error('Error reading localStorage data:', error);
    }

    return { savedSessions, currentSession };
  }

  /**
   * Convert legacy session data to MongoDB format
   */
  static convertLegacySession(legacySession: LegacyEvaluationSession, userId: string) {
    // Convert dates
    const convertDate = (date: string | Date) => {
      if (typeof date === 'string') {
        return new Date(date);
      }
      return date;
    };

    return {
      session: {
          userId,
        sessionId: legacySession.id,
        name: legacySession.name,
        status: legacySession.status,
        testConfigurationId: '', // Will be set after creating test config
          simulatedConversationIds: [],
        conversationScoreIds: [],
        createdAt: convertDate(legacySession.createdAt),
        updatedAt: convertDate(legacySession.updatedAt)
      },
      testConfiguration: {
        userId,
        sessionId: legacySession.id,
        chatbotType: legacySession.testConfig.chatbotType,
        systemPrompt: legacySession.testConfig.systemPrompt,
        testCases: legacySession.testConfig.testCases,
        conversationTurns: legacySession.testConfig.conversationTurns,
        conversationMode: legacySession.testConfig.conversationMode,
        conversationRange: legacySession.testConfig.conversationRange,
        customMetrics: legacySession.testConfig.customMetrics,
        scoringMetrics: legacySession.testConfig.scoringMetrics,
        generatedTestCases: legacySession.testConfig.generatedTestCases || [],
        uploadedTestCases: legacySession.testConfig.uploadedTestCases || [],
        csvFileName: legacySession.testConfig.csvFileName,
        useUploadedTestCases: legacySession.testConfig.useUploadedTestCases,
        chatbotMode: legacySession.testConfig.chatbotMode,
        endpointUrl: legacySession.testConfig.endpointUrl,
        endpointApiKey: legacySession.testConfig.endpointApiKey,
        isEndpointValid: legacySession.testConfig.isEndpointValid,
        useCorsProxy: legacySession.testConfig.useCorsProxy,
        authorizationToken: legacySession.testConfig.authorizationToken,
        extractedHeaders: legacySession.testConfig.extractedHeaders,
        extractedCookies: legacySession.testConfig.extractedCookies,
        agentType: legacySession.testConfig.agentType,
        guidelines: legacySession.testConfig.guidelines,
        timestamp: convertDate(legacySession.testConfig.timestamp)
      },
      simulatedConversations: legacySession.simulatedConversations.map(conv => ({
            userId,
        sessionId: legacySession.id,
        conversationId: conv.id,
        testCase: conv.testCase,
        messages: conv.messages.map(msg => ({
              ...msg,
          timestamp: convertDate(msg.timestamp)
        })),
        completed: conv.completed
      })),
      conversationScores: legacySession.conversationScores.map(score => ({
            userId,
        sessionId: legacySession.id,
            conversationId: score.conversationId,
            testCase: score.testCase,
        metricScores: score.metricScores.map(ms => ({
              ...ms,
          timestamp: convertDate(ms.timestamp)
            })),
            averageScore: score.averageScore
      }))
    };
  }

  /**
   * Migrate a single session from localStorage to MongoDB
   */
  static async migrateSession(legacySession: LegacyEvaluationSession, userId: string): Promise<boolean> {
    try {
      console.log(`Migrating session: ${legacySession.name}`);
      
      const convertedData = this.convertLegacySession(legacySession, userId);

      // Create test configuration first
      const testConfig = await TestConfigurationService.createTestConfiguration(convertedData.testConfiguration);
      console.log(`Created test configuration: ${testConfig._id}`);

      // Update session with test configuration ID
      const sessionData = {
        ...convertedData.session,
        testConfigurationId: testConfig._id!
      };

      // Create session
      const session = await SessionService.createSession(sessionData);
      console.log(`Created session: ${session._id}`);

      // Create simulated conversations
      const conversationIds: string[] = [];
      for (const conv of convertedData.simulatedConversations) {
        const conversation = await SimulatedConversationService.createSimulatedConversation(conv);
        conversationIds.push(conversation._id!);
      }
      console.log(`Created ${conversationIds.length} conversations`);

      // Create conversation scores
      const scoreIds: string[] = [];
      for (const score of convertedData.conversationScores) {
        const conversationScore = await ConversationScoreService.createConversationScore(score);
        scoreIds.push(conversationScore._id!);
      }
      console.log(`Created ${scoreIds.length} conversation scores`);

      // Update session with conversation and score IDs
      await SessionService.updateSession(session._id!, {
        simulatedConversationIds: conversationIds,
        conversationScoreIds: scoreIds
      });

      console.log(`Successfully migrated session: ${legacySession.name}`);
      return true;
    } catch (error) {
      console.error(`Error migrating session ${legacySession.name}:`, error);
      return false;
    }
  }

  /**
   * Migrate all localStorage data to MongoDB
   */
  static async migrateAllData(userId: string): Promise<{
    success: boolean;
    migratedSessions: number;
    failedSessions: string[];
  }> {
    console.log('Starting data migration from localStorage to MongoDB...');
    
    const { savedSessions, currentSession } = this.getLocalStorageData();
    const allSessions = [...savedSessions];
    
    // Add current session if it exists and is not already in saved sessions
    if (currentSession && !savedSessions.find(s => s.id === currentSession.id)) {
      allSessions.push(currentSession);
    }

    let migratedSessions = 0;
    const failedSessions: string[] = [];

    for (const session of allSessions) {
      const success = await this.migrateSession(session, userId);
      if (success) {
        migratedSessions++;
      } else {
        failedSessions.push(session.name);
      }
    }

    const migrationResult = {
      success: failedSessions.length === 0,
      migratedSessions,
      failedSessions
    };

    console.log('Migration completed:', migrationResult);
    return migrationResult;
  }

  /**
   * Clear localStorage data after successful migration
   */
  static clearLocalStorageData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CURRENT_SESSION_KEY);
      console.log('Cleared localStorage data after migration');
    } catch (error) {
      console.error('Error clearing localStorage data:', error);
    }
  }

  /**
   * Complete migration process with user confirmation
   */
  static async performMigration(userId: string, confirmClear: boolean = false): Promise<{
    success: boolean;
    migratedSessions: number;
    failedSessions: string[];
    localStorageCleared: boolean;
  }> {
    if (!this.hasLocalStorageData()) {
      console.log('No localStorage data found to migrate');
      return {
        success: true,
        migratedSessions: 0,
        failedSessions: [],
        localStorageCleared: false
      };
    }

    const migrationResult = await this.migrateAllData(userId);
    
    let localStorageCleared = false;
    if (migrationResult.success && confirmClear) {
      this.clearLocalStorageData();
      localStorageCleared = true;
    }
    
    return {
      ...migrationResult,
      localStorageCleared
    };
  }
}