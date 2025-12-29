import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  MessageSquare, 
  Target, 
  CheckCircle,
  ArrowRight,
  BarChart3,
  Zap,
  Play,
  Plus,
  Settings,
  Globe,
  Clock,
  Award,
  Activity,
  Database,
  FileText,
  Star,
  Brain,
  Upload,
  Eye,
  BookOpen
} from "lucide-react";
import heroImage from "@/assets/hero-dashboard.jpg";
import { useDataPersistence, EvaluationSession } from "@/contexts/DataPersistenceContext";
import SessionDetailsModal from "./SessionDetailsModal";
import DocumentationModal from "./DocumentationModal";

interface DashboardProps {
  onStartTest: () => void;
  onLoadSession: (session: any) => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const Dashboard = ({ onStartTest, onLoadSession, activeView, onViewChange }: DashboardProps) => {
  const { currentSession, savedSessions, canNavigateTo, clearCurrentSessionForNewEval, isLoading: contextLoading } = useDataPersistence();
  
  // Modal states
  const [selectedSession, setSelectedSession] = useState<EvaluationSession | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    totalSessions: number;
    completedSessions: number;
    totalTestCases: number;
    totalConversations: number;
    totalScores: number;
    averageScore: number;
    successRate: number;
    scoringMetrics: any[];
    recentSessions: any[];
    performanceTrend: { date: string; score: number }[];
    isLoading: boolean;
  }>({
    totalSessions: 0,
    completedSessions: 0,
    totalTestCases: 0,
    totalConversations: 0,
    totalScores: 0,
    averageScore: 0,
    successRate: 0,
    scoringMetrics: [],
    recentSessions: [],
    performanceTrend: [],
    isLoading: true
  });

  // Add effect to log activeView changes
  useEffect(() => {
    console.log('Dashboard: activeView state changed to:', activeView);
  }, [activeView]);

  // Load analytics data
  useEffect(() => {
    if (!contextLoading) {
      loadAnalyticsData();
    }
  }, [savedSessions, contextLoading]);

  // Load complete session data when a session is selected
  const loadCompleteSessionData = async (sessionId: string) => {
    try {
      // Get user ID from localStorage
      const userId = localStorage.getItem('user-id') || 'unknown';
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        headers: {
          'x-user-id': userId
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const sessionData = data.data;
        
        // Convert MongoDB session data to EvaluationSession format
        const completeSession = {
          id: sessionData.session._id,
          name: sessionData.session.name,
          testConfigurationId: sessionData.testConfiguration?._id,
          testConfig: sessionData.testConfiguration ? {
            chatbotType: sessionData.testConfiguration.chatbotType || '',
            systemPrompt: sessionData.testConfiguration.systemPrompt || '',
            testCases: sessionData.testConfiguration.testCases || 5,
            conversationTurns: sessionData.testConfiguration.conversationTurns || 3,
            conversationMode: sessionData.testConfiguration.conversationMode,
            conversationRange: sessionData.testConfiguration.conversationRange,
            customMetrics: sessionData.testConfiguration.customMetrics || [],
            scoringMetrics: sessionData.testConfiguration.scoringMetrics || [],
            generatedTestCases: sessionData.testConfiguration.generatedTestCases || [],
            uploadedTestCases: sessionData.testConfiguration.uploadedTestCases || [],
            csvFileName: sessionData.testConfiguration.csvFileName,
            useUploadedTestCases: sessionData.testConfiguration.useUploadedTestCases,
            chatbotMode: 'endpoint' as const,
            endpointUrl: sessionData.testConfiguration.endpointUrl || '',
            endpointApiKey: sessionData.testConfiguration.endpointApiKey,
            isEndpointValid: sessionData.testConfiguration.isEndpointValid,
            useCorsProxy: sessionData.testConfiguration.useCorsProxy,
            authorizationToken: sessionData.testConfiguration.authorizationToken,
            extractedHeaders: sessionData.testConfiguration.extractedHeaders,
            extractedCookies: sessionData.testConfiguration.extractedCookies,
            agentType: sessionData.testConfiguration.agentType,
            guidelines: sessionData.testConfiguration.guidelines,
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
        
        return completeSession;
      }
    } catch (error) {
      console.error('Error loading complete session data:', error);
    }
    return null;
  };

  console.log('Dashboard: Component rendered');
  console.log('Dashboard: Current session:', currentSession);
  console.log('Dashboard: Saved sessions count:', savedSessions.length);
  console.log('Dashboard: Active view:', activeView);

  // Load comprehensive analytics data
  const loadAnalyticsData = async () => {
    try {
      setAnalyticsData(prev => ({ ...prev, isLoading: true }));
      
      console.log('Dashboard: Loading analytics data from', savedSessions.length, 'sessions');
      
      // Calculate analytics from saved sessions
      const totalSessions = savedSessions.length;
      const completedSessions = savedSessions.filter(s => s.status === 'completed').length;
      
      let totalTestCases = 0;
      let totalConversations = 0;
      let totalScores = 0;
      let allScores: number[] = [];
      const recentSessions = savedSessions
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      
      const performanceTrend: { date: string; score: number }[] = [];
      
      savedSessions.forEach(session => {
        totalTestCases += session.testConfig.testCases || 0;
        totalConversations += session.simulatedConversations.length;
        totalScores += session.conversationScores.length;
        
        // Collect scores for average calculation
        session.conversationScores.forEach(score => {
          allScores.push(score.averageScore);
        });
        
        // Add to performance trend
        if (session.conversationScores.length > 0) {
          const sessionAverage = session.conversationScores.reduce((sum, score) => sum + score.averageScore, 0) / session.conversationScores.length;
          performanceTrend.push({
            date: new Date(session.updatedAt).toLocaleDateString(),
            score: sessionAverage
          });
        }
      });
      
      const averageScore = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
      const successRate = allScores.length > 0 ? (allScores.filter(score => score >= 0.7).length / allScores.length) * 100 : 0;
      
      // Load scoring metrics
      const userId = localStorage.getItem('user-id') || 'unknown';
      const metricsResponse = await fetch('/api/scoring-metrics', {
        headers: {
          'x-user-id': userId
        }
      });
      const metricsData = await metricsResponse.json();
      const scoringMetrics = metricsData.success ? metricsData.data : [];
      
      setAnalyticsData({
        totalSessions,
        completedSessions,
        totalTestCases,
        totalConversations,
        totalScores,
        averageScore,
        successRate,
        scoringMetrics,
        recentSessions,
        performanceTrend,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setAnalyticsData(prev => ({ ...prev, isLoading: false }));
    }
  };


  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {/* <Sidebar activeTab={activeView} onTabChange={onViewChange} /> */}
      
      {/* Main Content */}
      <div className="flex-1 ml-20 p-8 overflow-y-auto">
        {/* Loading Indicator */}
        {contextLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
              <p className="text-blue-600 font-medium">Loading evaluation data from database...</p>
            </div>
          </div>
        )}
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="relative bg-gradient-to-r from-primary/90 to-primary-glow/90 p-8 text-primary-foreground">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-3">
                GenAI Evals
              </h2>
              <p className="text-lg mb-6 text-primary-foreground/90">
                Test, analyze, and optimize your GenAI systems with comprehensive evaluation metrics and real-world scenarios.
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={onStartTest}
                  size="lg" 
                  className="btn-hero gap-2"
                >
                  <Zap className="h-5 w-5" />
                  Start New Test
                </Button>
                {currentSession && currentSession.conversationScores.length > 0 && (
                  <Button 
                    onClick={() => {
                      console.log('Dashboard: Starting fresh evaluation, clearing current session');
                      clearCurrentSessionForNewEval();
                      onStartTest();
                    }}
                    variant="outline" 
                    size="lg"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Plus className="h-5 w-5" />
                    Start Fresh Evaluation
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setShowDocumentation(true)}
                >
                  <BookOpen className="h-5 w-5" />
                  View Documentation
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Session Status */}
        {currentSession && (
          <Card className="metric-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Current Session: {currentSession.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{currentSession.testConfig.chatbotType || 'Not set'}</p>
                  <p className="text-sm text-muted-foreground">Chatbot Type</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{currentSession.simulatedConversations.length}</p>
                  <p className="text-sm text-muted-foreground">Conversations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{currentSession.conversationScores.length}</p>
                  <p className="text-sm text-muted-foreground">Scores</p>
                </div>
                <div className="text-center">
                  <Badge className="text-sm">
                    {currentSession.status.charAt(0).toUpperCase() + currentSession.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-8 w-8 text-blue-600" />
                <Badge className="badge-premium">Total</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.isLoading ? '...' : analyticsData.totalSessions}
                </p>
                <p className="text-sm text-muted-foreground">Evaluation Sessions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <Badge className="badge-premium">Completed</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.isLoading ? '...' : analyticsData.completedSessions}
                </p>
                <p className="text-sm text-muted-foreground">Completed Sessions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
                <Badge className="badge-premium">Total</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.isLoading ? '...' : analyticsData.totalTestCases}
                </p>
                <p className="text-sm text-muted-foreground">Test Cases</p>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <Badge className="badge-premium">Total</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {analyticsData.isLoading ? '...' : analyticsData.totalConversations}
                </p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <Badge className="badge-premium">Overall</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.isLoading ? '...' : analyticsData.averageScore.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-8 w-8 text-purple-600" />
                <Badge className="badge-premium">Success Rate</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.isLoading ? '...' : `${analyticsData.successRate.toFixed(1)}%`}
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-8 w-8 text-yellow-600" />
                <Badge className="badge-premium">Total</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {analyticsData.isLoading ? '...' : analyticsData.totalScores}
                </p>
                <p className="text-sm text-muted-foreground">Scores Generated</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Sessions */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.recentSessions.map((session, index) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {session.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.updatedAt).toLocaleDateString()} • {session.conversationScores.length} scores
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {session.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          title="View details"
                          onClick={() => {
                            setSelectedSession(session);
                            setShowSessionDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          title="Load session"
                          onClick={async () => {
                            const completeSession = await loadCompleteSessionData(session.id);
                            if (completeSession) {
                              onLoadSession(completeSession);
                            }
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No sessions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first evaluation session
                  </p>
                  <Button onClick={onStartTest} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Start First Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scoring Metrics */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Scoring Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.scoringMetrics.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.scoringMetrics.slice(0, 5).map((metric, index) => (
                    <div key={metric._id || index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {metric.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {metric.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {metric.totalPoints} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {analyticsData.scoringMetrics.length > 5 && (
                    <div className="text-center">
                      <Button variant="outline" size="sm" className="gap-2">
                        View All {analyticsData.scoringMetrics.length} Metrics
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No scoring metrics defined</p>
                  <p className="text-sm text-muted-foreground">
                    Scoring metrics will be created when you configure a new evaluation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Trend */}
        {analyticsData.performanceTrend.length > 0 && (
          <Card className="metric-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.performanceTrend.slice(0, 5).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {trend.date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Session Performance
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {trend.score.toFixed(2)}
                      </Badge>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${trend.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="metric-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => {
                  if (currentSession && currentSession.conversationScores.length > 0) {
                    console.log('Dashboard: Quick test - starting fresh evaluation');
                    clearCurrentSessionForNewEval();
                  }
                  onStartTest();
                }}
                className="w-full justify-start gap-2 btn-hero"
              >
                <Play className="h-4 w-4" />
                {currentSession && currentSession.conversationScores.length > 0 ? 'Start Fresh Test' : 'Run Quick Test'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => onViewChange("test-remote")}
              >
                <Globe className="h-4 w-4" />
                Test Remote Agent
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <SessionDetailsModal 
          session={selectedSession}
          open={showSessionDetails}
          onClose={() => {
            setShowSessionDetails(false);
            setSelectedSession(null);
          }}
        />
        
        <DocumentationModal 
          open={showDocumentation}
          onClose={() => setShowDocumentation(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;