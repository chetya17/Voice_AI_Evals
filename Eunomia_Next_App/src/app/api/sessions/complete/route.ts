import { NextRequest, NextResponse } from 'next/server';
import { 
  SessionService, 
  TestConfigurationService,
  ConversationService,
  ConversationScoreService,
  OverallScoresService
} from '@/lib/mongodbService';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/sessions/complete - Get all sessions with complete data for analytics
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    
    // Get all sessions for the user
    const sessions = await SessionService.getSessionsByUserId(userId);
    
    // Fetch complete data for each session in parallel
    const completeSessions = await Promise.all(
      sessions.map(async (session) => {
        const [testConfiguration, conversations, conversationScores, overallScores] = await Promise.all([
          TestConfigurationService.getTestConfigurationBySessionId(session._id),
          ConversationService.getConversationsBySessionId(session._id),
          ConversationScoreService.getConversationScoresBySessionId(session._id),
          OverallScoresService.getOverallScoresBySessionId(session._id)
        ]);

        return {
          id: session._id,
          name: session.name,
          agentDescription: session.agentDescription,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          testConfig: testConfiguration ? {
            chatbotType: testConfiguration.chatbotType || '',
            systemPrompt: testConfiguration.systemPrompt || '',
            testCases: testConfiguration.testCases || 5,
            conversationTurns: testConfiguration.conversationTurns || 3,
            conversationMode: testConfiguration.conversationMode,
            conversationRange: testConfiguration.conversationRange,
            customMetrics: testConfiguration.customMetrics || [],
            scoringMetrics: testConfiguration.scoringMetrics || [],
            generatedTestCases: testConfiguration.generatedTestCases || [],
            uploadedTestCases: testConfiguration.uploadedTestCases || [],
            csvFileName: testConfiguration.csvFileName,
            useUploadedTestCases: testConfiguration.useUploadedTestCases,
            chatbotMode: 'endpoint' as const,
            endpointUrl: testConfiguration.endpointUrl || '',
            endpointApiKey: testConfiguration.endpointApiKey,
            isEndpointValid: testConfiguration.isEndpointValid,
            useCorsProxy: testConfiguration.useCorsProxy,
            authorizationToken: testConfiguration.authorizationToken,
            extractedHeaders: testConfiguration.extractedHeaders,
            extractedCookies: testConfiguration.extractedCookies,
            agentType: testConfiguration.agentType,
            guidelines: testConfiguration.guidelines,
            timestamp: testConfiguration.timestamp || testConfiguration.createdAt
          } : null,
          simulatedConversations: conversations.map(conv => ({
            id: conv.conversationId,
            testCase: conv.testCase || '',
            messages: conv.messages.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.timestamp,
              metadata: msg.metadata
            })),
            completed: conv.completed
          })),
          conversationScores: conversationScores.map(score => ({
            conversationId: score.conversationId,
            testCase: score.testCase || '',
            metricScores: score.metricScores.map(ms => ({
              metricName: ms.metricName,
              score: ms.score,
              maxScore: ms.maxScore,
              feedback: ms.feedback,
              timestamp: ms.timestamp,
              isNotApplicable: ms.isNotApplicable
            })),
            averageScore: score.averageScore || 0
          })),
          overallScores: overallScores
        };
      })
    );
    
    return NextResponse.json(createSuccessResponse(completeSessions));
  } catch (error) {
    console.error('Error fetching complete sessions:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch complete sessions', 500)
    );
  }
}

