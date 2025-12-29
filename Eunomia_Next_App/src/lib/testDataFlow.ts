import { 
  SessionService, 
  TestCaseService, 
  ConversationService, 
  ConversationScoreService 
} from './mongodbService';

/**
 * Test script to verify complete data flow from test configuration to final results
 */
export class DataFlowTestService {
  private static readonly TEST_USER_ID = 'test-user-id';
  private static readonly TEST_SESSION_NAME = 'Data Flow Test Session';

  /**
   * Run complete data flow test
   */
  static async runCompleteTest(): Promise<{
    success: boolean;
    results: {
      sessionCreated: boolean;
      testConfigCreated: boolean;
      conversationsCreated: boolean;
      scoresCreated: boolean;
      dataRetrieved: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const results = {
      sessionCreated: false,
      testConfigCreated: false,
      conversationsCreated: false,
      scoresCreated: false,
      dataRetrieved: false
    };

    try {
      console.log('Starting complete data flow test...');

      // Step 1: Create test configuration
      console.log('Step 1: Creating test configuration...');
      const testConfig = await this.createTestConfiguration();
      results.testConfigCreated = true;
      console.log('✓ Test configuration created:', testConfig._id);

      // Step 2: Create session
      console.log('Step 2: Creating session...');
      const session = await this.createSession(testConfig._id!);
      results.sessionCreated = true;
      console.log('✓ Session created:', session._id);

      // Step 3: Create simulated conversations
      console.log('Step 3: Creating simulated conversations...');
      const conversations = await this.createSimulatedConversations(session._id!);
      results.conversationsCreated = true;
      console.log(`✓ Created ${conversations.length} conversations`);

      // Step 4: Create conversation scores
      console.log('Step 4: Creating conversation scores...');
      const scores = await this.createConversationScores(session._id!, conversations);
      results.scoresCreated = true;
      console.log(`✓ Created ${scores.length} conversation scores`);

      // Step 5: Retrieve complete session data
      console.log('Step 5: Retrieving complete session data...');
      const completeData = await this.retrieveCompleteSessionData(session._id!);
      results.dataRetrieved = true;
      console.log('✓ Complete session data retrieved successfully');

      // Step 6: Verify data integrity
      console.log('Step 6: Verifying data integrity...');
      const integrityCheck = this.verifyDataIntegrity(completeData, conversations, scores);
      if (!integrityCheck.valid) {
        errors.push(...integrityCheck.errors);
      } else {
        console.log('✓ Data integrity verified');
      }

      // Cleanup test data
      console.log('Cleaning up test data...');
      await this.cleanupTestData(session._id!);

      console.log('✓ Complete data flow test completed successfully');
      return {
        success: errors.length === 0,
        results,
        errors
      };

    } catch (error) {
      console.error('Data flow test failed:', error);
      errors.push(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        results,
        errors
      };
    }
  }

  /**
   * Create a test configuration
   */
  private static async createTestConfiguration() {
    const testConfigData = {
      userId: this.TEST_USER_ID,
      sessionId: `test_session_${Date.now()}`,
      chatbotType: 'GPT-4',
      systemPrompt: 'You are a helpful AI assistant for testing purposes.',
      testCases: 3,
      conversationTurns: 2,
      conversationMode: 'fixed' as const,
      customMetrics: ['helpfulness', 'accuracy'],
      scoringMetrics: [
        {
          name: 'Helpfulness',
          description: 'How helpful was the response?',
          totalPoints: 10,
          rubrics: [
            { criterion: 'Very helpful', points: 10, description: 'Response directly addresses the question' },
            { criterion: 'Somewhat helpful', points: 5, description: 'Response partially addresses the question' },
            { criterion: 'Not helpful', points: 0, description: 'Response does not address the question' }
          ]
        }
      ],
      generatedTestCases: [
        'What is the capital of France?',
        'How do I bake a chocolate cake?',
        'What are the benefits of exercise?'
      ],
      chatbotMode: 'endpoint' as const,
      endpointUrl: 'https://api.openai.com/v1/chat/completions',
      agentType: 'test-agent',
      guidelines: {
        testCaseGuideline: 'Test cases should be clear and specific',
        scoringGuideline: 'Score based on helpfulness and accuracy',
        simulationGuideline: 'Simulate realistic user interactions'
      },
      timestamp: new Date()
    };

    return await TestConfigurationService.createTestConfiguration(testConfigData);
  }

  /**
   * Create a test session
   */
  private static async createSession(testConfigId: string) {
    const sessionData = {
      userId: this.TEST_USER_ID,
      sessionId: `test_session_${Date.now()}`,
      name: this.TEST_SESSION_NAME,
      status: 'configured' as const,
      testConfigurationId: testConfigId,
      simulatedConversationIds: [],
      conversationScoreIds: []
    };

    return await SessionService.createSession(sessionData);
  }

  /**
   * Create simulated conversations
   */
  private static async createSimulatedConversations(sessionId: string) {
    const conversations = [];
    const testCases = [
      'What is the capital of France?',
      'How do I bake a chocolate cake?',
      'What are the benefits of exercise?'
    ];

    for (let i = 0; i < testCases.length; i++) {
      const conversationData = {
        userId: this.TEST_USER_ID,
        sessionId,
        conversationId: `test_conv_${i}`,
        testCase: testCases[i],
        messages: [
          {
            role: 'user' as const,
            content: testCases[i],
            timestamp: new Date(),
            metadata: { turn: 1 }
          },
          {
            role: 'assistant' as const,
            content: `This is a test response for: ${testCases[i]}`,
            timestamp: new Date(),
            metadata: { turn: 1, responseTime: 1000 }
          }
        ],
        completed: true
      };

      const conversation = await SimulatedConversationService.createSimulatedConversation(conversationData);
      conversations.push(conversation);
    }

    return conversations;
  }

  /**
   * Create conversation scores
   */
  private static async createConversationScores(sessionId: string, conversations: any[]) {
    const scores = [];

    for (const conversation of conversations) {
      const scoreData = {
        userId: this.TEST_USER_ID,
        sessionId,
        conversationId: conversation.conversationId,
        testCase: conversation.testCase,
        metricScores: [
          {
            metricId: 'helpfulness',
            metricName: 'Helpfulness',
            score: 8,
            maxScore: 10,
            feedback: 'Response was helpful and addressed the question',
            timestamp: new Date(),
            isNotApplicable: false
          },
          {
            metricId: 'accuracy',
            metricName: 'Accuracy',
            score: 9,
            maxScore: 10,
            feedback: 'Response was accurate and informative',
            timestamp: new Date(),
            isNotApplicable: false
          }
        ],
        averageScore: 8.5
      };

      const score = await ConversationScoreService.createConversationScore(scoreData);
      scores.push(score);
    }

    return scores;
  }

  /**
   * Retrieve complete session data
   */
  private static async retrieveCompleteSessionData(sessionId: string) {
    return await SessionService.getCompleteSessionData(sessionId);
  }

  /**
   * Verify data integrity
   */
  private static verifyDataIntegrity(completeData: any, expectedConversations: any[], expectedScores: any[]) {
    const errors: string[] = [];

    // Check session exists
    if (!completeData.session) {
      errors.push('Session not found in complete data');
    }

    // Check test configuration exists
    if (!completeData.testConfiguration) {
      errors.push('Test configuration not found in complete data');
    }

    // Check conversations count
    if (completeData.simulatedConversations.length !== expectedConversations.length) {
      errors.push(`Expected ${expectedConversations.length} conversations, got ${completeData.simulatedConversations.length}`);
    }

    // Check scores count
    if (completeData.conversationScores.length !== expectedScores.length) {
      errors.push(`Expected ${expectedScores.length} scores, got ${completeData.conversationScores.length}`);
    }

    // Check conversation data integrity
    for (const expectedConv of expectedConversations) {
      const foundConv = completeData.simulatedConversations.find((c: any) => c.conversationId === expectedConv.conversationId);
      if (!foundConv) {
        errors.push(`Conversation ${expectedConv.conversationId} not found in retrieved data`);
      } else if (foundConv.messages.length !== expectedConv.messages.length) {
        errors.push(`Conversation ${expectedConv.conversationId} has incorrect message count`);
      }
    }

    // Check score data integrity
    for (const expectedScore of expectedScores) {
      const foundScore = completeData.conversationScores.find((s: any) => s.conversationId === expectedScore.conversationId);
      if (!foundScore) {
        errors.push(`Score for conversation ${expectedScore.conversationId} not found in retrieved data`);
      } else if (foundScore.metricScores.length !== expectedScore.metricScores.length) {
        errors.push(`Score for conversation ${expectedScore.conversationId} has incorrect metric count`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup test data
   */
  private static async cleanupTestData(sessionId: string) {
    try {
      // Get session data to clean up related data
      const sessionData = await SessionService.getCompleteSessionData(sessionId);
      
      if (sessionData.session) {
        // Delete conversations
        if (sessionData.simulatedConversations.length > 0) {
          await SimulatedConversationService.deleteSimulatedConversationsBySessionId(sessionId);
        }

        // Delete scores
        if (sessionData.conversationScores.length > 0) {
          await ConversationScoreService.deleteConversationScoresBySessionId(sessionId);
        }

        // Delete test configuration
        if (sessionData.testConfiguration) {
          await TestConfigurationService.deleteTestConfiguration(sessionData.testConfiguration._id!);
        }

        // Delete session
        await SessionService.deleteSession(sessionId);
      }

      console.log('✓ Test data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  /**
   * Run a quick connectivity test
   */
  static async runConnectivityTest(): Promise<boolean> {
    try {
      console.log('Testing MongoDB connectivity...');
      
      // Try to get user sessions (should return empty array if no data)
      const sessions = await SessionService.getSessionsByUserId(this.TEST_USER_ID);
      
      console.log('✓ MongoDB connectivity test passed');
      return true;
    } catch (error) {
      console.error('✗ MongoDB connectivity test failed:', error);
      return false;
    }
  }
}
