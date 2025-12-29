import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  FileText, 
  BarChart3, 
  Play, 
  Settings,
  Upload,
  Search,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import RAGEvaluation from './RAGEvaluation';
import { useToast } from '@/hooks/use-toast';

interface RAGTestSuiteProps {
  sessionId: string;
  onTestComplete?: (results: any) => void;
}

interface Document {
  documentId: string;
  fileName: string;
  fileSize: number;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  textLength?: number;
  chunkCount?: number;
  createdAt: string;
}

interface RAGTestResult {
  testCaseId: string;
  question: string;
  answer: string;
  contexts: string[];
  scores: {
    [metricName: string]: {
      metricName: string;
      score: number;
      explanation: string;
      details?: any;
    };
    overallScore: number;
  };
  timestamp: Date;
}

const RAGTestSuite = ({ sessionId, onTestComplete }: RAGTestSuiteProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [testResults, setTestResults] = useState<RAGTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const { toast } = useToast();

  // Sample test cases for RAG evaluation
  const sampleTestCases = [
    "What is the main topic discussed in the document?",
    "Can you summarize the key points from the document?",
    "What are the specific details mentioned in the document?",
    "How does the document explain the concept?",
    "What examples are provided in the document?",
    "What are the conclusions drawn in the document?",
    "What methodology is described in the document?",
    "What are the limitations mentioned in the document?",
    "What recommendations are made in the document?",
    "What background information is provided in the document?"
  ];

  const runRAGTests = async () => {
    if (documents.filter(doc => doc.status === 'processed').length === 0) {
      toast({
        title: 'No processed documents',
        description: 'Please upload and process at least one document before running tests.',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    setCurrentTest(0);
    setTotalTests(sampleTestCases.length);
    setTestResults([]);

    try {
      const results: RAGTestResult[] = [];

      for (let i = 0; i < sampleTestCases.length; i++) {
        setCurrentTest(i + 1);
        const question = sampleTestCases[i];

        // Search for relevant contexts
        const searchResponse = await fetch('/api/documents/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('user-id') || 'unknown'
          },
          body: JSON.stringify({
            query: question,
            sessionId,
            limit: 5
          })
        });

        const searchResult = await searchResponse.json();
        if (!searchResult.success) {
          throw new Error('Search failed');
        }

        const contexts = searchResult.data.chunks.map((chunk: any) => chunk.content);

        // Generate answer
        const answerResponse = await fetch('/api/generated-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('user-id') || 'unknown'
          },
          body: JSON.stringify({
            prompt: `Based on the following contexts, please answer the question: ${question}\n\nContexts:\n${contexts.join('\n\n')}`,
            sessionId
          })
        });

        const answerResult = await answerResponse.json();
        if (!answerResult.success) {
          throw new Error('Answer generation failed');
        }

        const answer = answerResult.data.content;

        // Evaluate RAG performance
        const evalResponse = await fetch('/api/rag-evaluation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('user-id') || 'unknown'
          },
          body: JSON.stringify({
            question,
            answer,
            contexts,
            sessionId,
            testCaseId: `rag_test_${i + 1}`
          })
        });

        const evalResult = await evalResponse.json();
        if (!evalResult.success) {
          throw new Error('Evaluation failed');
        }

        const testResult: RAGTestResult = {
          testCaseId: `rag_test_${i + 1}`,
          question,
          answer,
          contexts,
          scores: evalResult.data.scores,
          timestamp: new Date()
        };

        results.push(testResult);
        setTestResults([...results]);

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setTestResults(results);
      onTestComplete?.(results);

      toast({
        title: 'RAG Tests Completed',
        description: `Successfully completed ${results.length} RAG evaluation tests.`
      });

    } catch (error) {
      console.error('RAG test error:', error);
      toast({
        title: 'Test failed',
        description: 'Failed to run RAG tests. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const calculateAverageScores = () => {
    if (testResults.length === 0) return null;

    const scoreTotals: { [key: string]: number } = {};
    const scoreCounts: { [key: string]: number } = {};

    testResults.forEach(result => {
      Object.entries(result.scores).forEach(([metricName, metricResult]) => {
        if (metricName !== 'overallScore') {
          if (!scoreTotals[metricName]) {
            scoreTotals[metricName] = 0;
            scoreCounts[metricName] = 0;
          }
          scoreTotals[metricName] += metricResult.score;
          scoreCounts[metricName]++;
        }
      });
    });

    const averages: { [key: string]: number } = {};
    Object.keys(scoreTotals).forEach(metricName => {
      averages[metricName] = scoreTotals[metricName] / scoreCounts[metricName];
    });

    // Calculate overall average
    const overallScores = testResults.map(r => r.scores.overallScore);
    averages.overallScore = overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length;

    return averages;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const averageScores = calculateAverageScores();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            RAG Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Upload PDF documents and evaluate your RAG system's performance using comprehensive metrics.
          </p>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={runRAGTests}
              disabled={isRunning || documents.filter(doc => doc.status === 'processed').length === 0}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? `Running Tests (${currentTest}/${totalTests})` : 'Run RAG Tests'}
            </Button>

            {documents.filter(doc => doc.status === 'processed').length > 0 && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {documents.filter(doc => doc.status === 'processed').length} Documents Ready
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <Upload className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <Search className="h-4 w-4" />
            Manual Evaluation
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Test Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentUpload
            sessionId={sessionId}
            onDocumentsChange={setDocuments}
          />
        </TabsContent>

        <TabsContent value="evaluation">
          <RAGEvaluation
            sessionId={sessionId}
            documents={documents}
          />
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-6">
            {/* Overall Performance */}
            {averageScores && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(averageScores).map(([metric, score]) => (
                      <div key={metric} className="text-center p-4 border rounded-lg">
                        <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                          {(score * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {metric.replace(/_/g, ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Test Results */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Test Results ({testResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testResults.map((result, index) => (
                      <div key={result.testCaseId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Test Case {index + 1}</h4>
                          <Badge className={getScoreBadgeColor(result.scores.overallScore)}>
                            {(result.scores.overallScore * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {result.question}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          {Object.entries(result.scores).map(([metricName, metricResult]) => {
                            if (metricName === 'overallScore') return null;
                            return (
                              <div key={metricName} className="text-center">
                                <p className={`font-medium ${getScoreColor(metricResult.score)}`}>
                                  {(metricResult.score * 100).toFixed(1)}%
                                </p>
                                <p className="text-muted-foreground">
                                  {metricName.replace(/_/g, ' ')}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {testResults.length === 0 && !isRunning && (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No test results yet</p>
                  <p className="text-sm text-muted-foreground">
                    Run RAG tests to see evaluation results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RAGTestSuite;
