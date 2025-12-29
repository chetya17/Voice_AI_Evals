import { NextRequest, NextResponse } from 'next/server';
import { GuidelineService, TestCaseService, ScoringMetricService } from '@/lib/mongodbService';
import { getUserId, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// GET /api/generated-content - Get all generated content for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const contentType = searchParams.get('contentType');
    
    let content = [];
    
    if (sessionId) {
      // Get all generated content for a specific session
      const [guidelines, testCases, scoringMetrics] = await Promise.all([
        GuidelineService.getGuidelinesBySessionId(sessionId),
        TestCaseService.getTestCasesBySessionId(sessionId),
        ScoringMetricService.getScoringMetricsBySessionId(sessionId)
      ]);
      
      content = [
        ...guidelines.filter(g => g.source === 'generated'),
        ...testCases.filter(tc => tc.source === 'generated'),
        ...scoringMetrics.filter(sm => sm.source === 'generated')
      ];
    } else if (contentType) {
      // Get content by type
      switch (contentType) {
        case 'guidelines':
          content = await GuidelineService.getGuidelinesByUserId(userId);
          break;
        case 'test_cases':
          content = await TestCaseService.getTestCasesByUserId(userId);
          break;
        case 'scoring_metrics':
          content = await ScoringMetricService.getScoringMetricsByUserId(userId);
          break;
        default:
          content = [];
      }
    } else {
      // Get all generated content for user
      const [guidelines, testCases, scoringMetrics] = await Promise.all([
        GuidelineService.getGuidelinesByUserId(userId),
        TestCaseService.getTestCasesByUserId(userId),
        ScoringMetricService.getScoringMetricsByUserId(userId)
      ]);
      
      content = [
        ...guidelines.filter(g => g.source === 'generated'),
        ...testCases.filter(tc => tc.source === 'generated'),
        ...scoringMetrics.filter(sm => sm.source === 'generated')
      ];
    }
    
    return NextResponse.json(createSuccessResponse(content));
  } catch (error) {
    console.error('Error fetching generated content:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch generated content', 500));
  }
}

// POST /api/generated-content - Create new generated content
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { sessionId, contentType, content, metadata } = body;

    if (!sessionId || !contentType || !content) {
      return NextResponse.json(createErrorResponse('Session ID, content type, and content are required', 400));
    }

    let newContent;
    
    switch (contentType) {
      case 'guidelines':
        newContent = await GuidelineService.createGuideline({
          userId,
          sessionId,
          guidelineId: `guideline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'test_case',
          content,
          isEdited: false
        });
        break;
      case 'test_cases':
        newContent = await TestCaseService.createTestCase({
          userId,
          sessionId,
          testCaseId: `testcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          source: 'generated'
        });
        break;
      case 'scoring_metrics':
        newContent = await ScoringMetricService.createScoringMetric({
          userId,
          sessionId,
          metricId: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: metadata?.name || 'Generated Metric',
          description: content,
          totalPoints: metadata?.totalPoints || 10,
          rubrics: metadata?.rubrics || [],
          source: 'generated'
        });
        break;
      default:
        return NextResponse.json(createErrorResponse('Invalid content type', 400));
    }
    
    return NextResponse.json(createSuccessResponse(newContent));
  } catch (error) {
    console.error('Error creating generated content:', error);
    return NextResponse.json(createErrorResponse('Failed to create generated content', 500));
  }
}
