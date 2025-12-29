import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  FileText, 
  Download, 
  Eye,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";

interface MetricScore {
  metricName: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  timestamp: Date;
  isNotApplicable?: boolean;
}

interface ConversationScore {
  conversationId: string;
  testCase: string;
  metricScores: MetricScore[];
  averageScore: number;
}

interface ScoreCompilationProps {
  conversationScores: ConversationScore[];
  scoringMetrics: any[];
  chatbotType: string;
  systemPrompt: string;
  onBackToDashboard?: () => void;
}

const ScoreCompilation = ({ 
  conversationScores, 
  scoringMetrics, 
  chatbotType, 
  systemPrompt,
  onBackToDashboard
}: ScoreCompilationProps) => {
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<string>("all");

  console.log('ScoreCompilation: Component rendered');
  console.log('ScoreCompilation: conversationScores count:', conversationScores.length);
  console.log('ScoreCompilation: onBackToDashboard function:', !!onBackToDashboard);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    if (conversationScores.length === 0) return null;

    const allScores = conversationScores.flatMap(cs => cs.metricScores);
    

    
    // Filter out "Not Applicable" scores (null) for calculations
    const validScores = allScores.filter(ms => ms.score !== null);
    const notApplicableCount = allScores.filter(ms => ms.score === null).length;
    
    const metricStats = scoringMetrics.map(metric => {
      const metricScores = allScores.filter(ms => ms.metricName === metric.name);
      const validMetricScores = metricScores.filter(ms => ms.score !== null);
      const notApplicableMetricCount = metricScores.filter(ms => ms.score === null).length;
      
      const scores = validMetricScores.map(ms => ms.score);
      
      return {
        name: metric.name,
        average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
        count: scores.length,
        notApplicableCount: notApplicableMetricCount,
        standardDeviation: scores.length > 0 ? 
          Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - (scores.reduce((a, b) => a + b, 0) / scores.length), 2), 0) / scores.length) : 0
      };
    });

    // Calculate overall statistics from valid scores only
    const overallAverage = validScores.length > 0 ? validScores.reduce((sum, ms) => sum + ms.score, 0) / validScores.length : 0;
    const overallMin = validScores.length > 0 ? Math.min(...validScores.map(ms => ms.score)) : 0;
    const overallMax = validScores.length > 0 ? Math.max(...validScores.map(ms => ms.score)) : 0;
    
    const conversationAverages = conversationScores.map(cs => cs.averageScore);

    return {
      totalConversations: conversationScores.length,
      totalMetrics: scoringMetrics.length,
      totalScores: validScores.length,
      notApplicableCount,
      overallAverage,
      overallMin,
      overallMax,
      metricStats,
      conversationAverages
    };
  }, [conversationScores, scoringMetrics]);

  const filteredConversations = useMemo(() => {
    if (selectedConversation === "all") return conversationScores;
    return conversationScores.filter(cs => cs.conversationId === selectedConversation);
  }, [conversationScores, selectedConversation]);

  const filteredMetricStats = useMemo(() => {
    if (selectedMetric === "all") return stats?.metricStats || [];
    return stats?.metricStats.filter(ms => ms.name === selectedMetric) || [];
  }, [stats, selectedMetric]);

  const exportResults = () => {
    const data = {
      chatbotType,
      systemPrompt,
      timestamp: new Date().toISOString(),
      summary: {
        totalConversations: stats?.totalConversations,
        totalMetrics: stats?.totalMetrics,
        totalScores: stats?.totalScores,
        notApplicableCount: stats?.notApplicableCount,
        overallAverage: stats?.overallAverage,
        overallMin: stats?.overallMin,
        overallMax: stats?.overallMax
      },
      metricStats: stats?.metricStats,
      conversationScores: conversationScores.map(cs => ({
        testCase: cs.testCase,
        averageScore: cs.averageScore,
        metricScores: cs.metricScores.map(ms => ({
          metricName: ms.metricName,
          score: ms.score,
          maxScore: ms.maxScore,
          feedback: ms.feedback,
          isNotApplicable: ms.isNotApplicable
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-evaluation-${chatbotType}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!stats || conversationScores.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No scoring data available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please complete the automated scoring process first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Score Compilation & Analysis</h2>
          <p className="text-muted-foreground">
            {conversationScores.length > 0 
              ? `Comprehensive analysis of ${stats.totalConversations} conversations across ${stats.totalMetrics} metrics`
              : "No scoring data available for analysis"
            }
            {stats?.notApplicableCount > 0 && (
              <span className="block mt-1 text-xs text-orange-600">
                {stats.notApplicableCount} metric{stats.notApplicableCount > 1 ? 's' : ''} marked as "Not Applicable" and excluded from calculations
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {onBackToDashboard && (
            <Button 
              onClick={() => {
                console.log('ScoreCompilation: Back to Dashboard button clicked');
                onBackToDashboard();
              }} 
              variant="outline" 
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Back to Dashboard
            </Button>
          )}
          {onBackToDashboard && (
            <Button 
              onClick={() => {
                console.log('ScoreCompilation: Starting new evaluation from results');
                onBackToDashboard();
              }} 
              variant="default" 
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Start New Evaluation
            </Button>
          )}
          <Button 
            onClick={exportResults} 
            variant="outline" 
            className="gap-2"
            disabled={conversationScores.length === 0}
          >
            <Download className="h-4 w-4" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      {conversationScores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalConversations}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalMetrics}</p>
                <p className="text-xs text-muted-foreground">Metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.overallAverage.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Overall Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalScores}</p>
                <p className="text-xs text-muted-foreground">Total Scores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.notApplicableCount}</p>
                <p className="text-xs text-muted-foreground">Not Applicable</p>
                <p className="text-xs text-orange-600">(Excluded from calculations)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Score Range */}
      {conversationScores.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Overall Score Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-red-500">{stats.overallMin.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Lowest Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{stats.overallAverage.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-500">{stats.overallMax.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Highest Score</p>
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Tabs */}
      {conversationScores.length > 0 && (
        <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Metric Analysis</TabsTrigger>
          <TabsTrigger value="conversations">Conversation Analysis</TabsTrigger>
          <TabsTrigger value="details">Detailed Results</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <Card className="metric-card">
            <CardHeader>
              <CardTitle>Metric Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.metricStats.map((metricStat, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{metricStat.name}</h4>
                      <Badge variant="outline">
                        {metricStat.count} scores
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Average</p>
                        <p className="font-semibold">{metricStat.average.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min</p>
                        <p className="font-semibold text-red-500">{metricStat.min.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max</p>
                        <p className="font-semibold text-green-500">{metricStat.max.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Std Dev</p>
                        <p className="font-semibold">{metricStat.standardDeviation.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Not Applicable</p>
                        <p className="font-semibold text-orange-500">{metricStat.notApplicableCount}</p>
                        <p className="text-xs text-orange-600">(Excluded)</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>0.0</span>
                        <span>1.0</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${(metricStat.average / 1.0) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card className="metric-card">
            <CardHeader>
              <CardTitle>Conversation Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversationScores.map((convScore, index) => (
                  <div key={convScore.conversationId} className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Test Case {index + 1}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {convScore.testCase}
                        </p>
                      </div>
                      <Badge variant="default">
                        {convScore.averageScore.toFixed(2)} avg
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {convScore.metricScores.map((metricScore, msIndex) => (
                        <div key={msIndex} className="flex items-center justify-between text-sm p-2 rounded bg-muted/10">
                          <span className="text-muted-foreground">{metricScore.metricName}</span>
                          <span className="font-medium">
                            {metricScore.score === null ? (
                              <span className="text-orange-500">Not Applicable</span>
                            ) : (
                              `${metricScore.score.toFixed(2)}/${metricScore.maxScore}`
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card className="metric-card">
            <CardHeader>
              <CardTitle>Detailed Scoring Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {conversationScores.map((convScore, index) => (
                  <div key={convScore.conversationId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium">Test Case {index + 1}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <Badge variant="default">
                          {convScore.averageScore.toFixed(2)} average
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {convScore.testCase}
                    </p>
                    
                    <div className="space-y-4">
                      {convScore.metricScores.map((metricScore, msIndex) => (
                        <div key={msIndex} className="border-l-4 border-primary/20 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{metricScore.metricName}</h5>
                            <Badge variant={metricScore.score === null ? "secondary" : "outline"}>
                              {metricScore.score === null ? (
                                "Not Applicable"
                              ) : (
                                `${metricScore.score.toFixed(2)}/${metricScore.maxScore}`
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {metricScore.feedback}
                            {metricScore.score === null && (
                              <span className="block mt-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <strong>Note:</strong> This metric was marked as "Not Applicable" because it was not relevant to the conversation context.
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
      )}

      {/* Recommendations */}
      {conversationScores.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Performance Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Top Performing Metrics</h4>
              <div className="space-y-2">
                {stats.metricStats
                  .filter(metric => metric.average > 0.5)
                  .sort((a, b) => b.average - a.average)
                  .slice(0, 3)
                  .map((metric, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{metric.name}</span>
                      <Badge variant="outline">{metric.average.toFixed(2)}</Badge>
                    </div>
                  ))}
                {stats.metricStats.filter(metric => metric.average > 0.5).length === 0 && (
                  <p className="text-sm text-muted-foreground">No metrics with scores above 0.5</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Areas for Improvement</h4>
              <div className="space-y-2">
                {stats.metricStats
                  .filter(metric => metric.average <= 0.5)
                  .sort((a, b) => a.average - b.average)
                  .slice(0, 3)
                  .map((metric, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{metric.name}</span>
                      <Badge variant="outline">{metric.average.toFixed(2)}</Badge>
                    </div>
                  ))}
                {stats.metricStats.filter(metric => metric.average <= 0.5).length === 0 && (
                  <p className="text-sm text-muted-foreground">No metrics with scores 0.5 and below</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Overall Assessment</h4>
            <p className="text-sm text-muted-foreground">
              {stats.overallAverage >= 0.8 ? 
                "Excellent performance across all metrics with consistent high scores." :
                stats.overallAverage >= 0.6 ? 
                "Good performance with some areas showing room for improvement." :
                "Performance indicates several areas need attention and optimization."
              }
              {stats.notApplicableCount > 0 && (
                <span className="block mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  <strong>Note:</strong> {stats.notApplicableCount} scoring metric{stats.notApplicableCount > 1 ? 's were' : ' was'} marked as "Not Applicable" because they were not relevant to certain conversation contexts. These metrics are completely excluded from all score calculations, averages, and statistics.
                </span>
              )}
            </p>
          </div>
        </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScoreCompilation;
