import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  BarChart3,
  FileText,
  Target,
  Zap,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RAGEvaluationProps {
  sessionId: string;
  documents: any[];
}

interface RAGASMetric {
  name: string;
  description: string;
  category: 'answer_quality' | 'context_quality' | 'faithfulness' | 'custom';
  weight: number;
}

interface RAGEvaluationResult {
  evaluationId: string;
  question: string;
  answer: string;
  contexts: string[];
  metrics: RAGASMetric[];
  scores: {
    [metricName: string]: {
      metricName: string;
      score: number;
      explanation: string;
      details?: any;
    };
    overallScore: number;
  };
  createdAt: string;
}

interface CustomMetric {
  name: string;
  description: string;
  category: string;
  prompt: string;
}

const RAGEvaluation = ({ sessionId, documents }: RAGEvaluationProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [evaluations, setEvaluations] = useState<RAGEvaluationResult[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<RAGEvaluationResult | null>(null);
  
  // Metric selection
  const [availableMetrics, setAvailableMetrics] = useState<RAGASMetric[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [showCustomMetricForm, setShowCustomMetricForm] = useState(false);
  const [newCustomMetric, setNewCustomMetric] = useState<CustomMetric>({
    name: '',
    description: '',
    category: 'custom',
    prompt: ''
  });
  
  const { toast } = useToast();

  // Load available metrics
  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/rag-metrics');
      const result = await response.json();
      
      if (result.success) {
        setAvailableMetrics(result.data.metrics);
        // Select all metrics by default
        setSelectedMetrics(result.data.metrics.map((m: RAGASMetric) => m.name));
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  // Add custom metric
  const addCustomMetric = () => {
    if (newCustomMetric.name && newCustomMetric.description && newCustomMetric.prompt) {
      setCustomMetrics(prev => [...prev, { ...newCustomMetric }]);
      setNewCustomMetric({
        name: '',
        description: '',
        category: 'custom',
        prompt: ''
      });
      setShowCustomMetricForm(false);
      toast({
        title: 'Custom metric added',
        description: `${newCustomMetric.name} has been added to the evaluation.`
      });
    }
  };

  // Remove custom metric
  const removeCustomMetric = (index: number) => {
    setCustomMetrics(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle metric selection
  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricName) 
        ? prev.filter(name => name !== metricName)
        : [...prev, metricName]
    );
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const searchDocuments = async () => {
    if (!question.trim()) {
      toast({
        title: 'Question required',
        description: 'Please enter a question to search documents.',
        variant: 'destructive'
      });
      return;
    }

    setSearching(true);

    try {
      const response = await fetch('/api/documents/search', {
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

      const result = await response.json();

      if (result.success) {
        setContexts(result.data.chunks.map((chunk: any) => chunk.content));
        toast({
          title: 'Search completed',
          description: `Found ${result.data.chunks.length} relevant contexts.`
        });
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search documents. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const generateAnswer = async () => {
    if (!question.trim() || contexts.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please search for contexts first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Use OpenAI to generate answer based on contexts
      const response = await fetch('/api/generated-content', {
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

      const result = await response.json();

      if (result.success) {
        setAnswer(result.data.content);
      } else {
        throw new Error(result.error || 'Answer generation failed');
      }
    } catch (error) {
      console.error('Answer generation error:', error);
      toast({
        title: 'Answer generation failed',
        description: 'Failed to generate answer. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const evaluateRAG = async () => {
    if (!question.trim() || !answer.trim() || contexts.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please provide question, answer, and contexts.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedMetrics.length === 0 && customMetrics.length === 0) {
      toast({
        title: 'No metrics selected',
        description: 'Please select at least one metric for evaluation.',
        variant: 'destructive'
      });
      return;
    }

    setEvaluating(true);

    try {
      const response = await fetch('/api/rag-evaluation', {
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
          metrics: selectedMetrics,
          customMetrics: customMetrics
        })
      });

      const result = await response.json();

      if (result.success) {
        const newEvaluation = result.data;
        setEvaluations(prev => [newEvaluation, ...prev]);
        setSelectedEvaluation(newEvaluation);
        
        toast({
          title: 'Evaluation completed',
          description: `RAG evaluation completed with overall score: ${(newEvaluation.scores.overallScore * 100).toFixed(1)}%`
        });
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: 'Evaluation failed',
        description: 'Failed to perform RAG evaluation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setEvaluating(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      const response = await fetch(`/api/rag-evaluation?sessionId=${sessionId}`, {
        headers: {
          'x-user-id': localStorage.getItem('user-id') || 'unknown'
        }
      });

      const result = await response.json();

      if (result.success) {
        setEvaluations(result.data);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [sessionId]);

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

  return (
    <div className="space-y-6">
      {/* RAG Evaluation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            RAG Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metric Selection */}
          <Tabs defaultValue="predefined" className="space-y-4">
            <TabsList>
              <TabsTrigger value="predefined">Predefined Metrics</TabsTrigger>
              <TabsTrigger value="custom">Custom Metrics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="predefined" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Evaluation Metrics</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableMetrics.map((metric) => (
                    <div key={metric.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.name}
                        checked={selectedMetrics.includes(metric.name)}
                        onCheckedChange={() => toggleMetric(metric.name)}
                      />
                      <label
                        htmlFor={metric.name}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <div className="font-medium">{metric.name.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">{metric.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Custom Metrics</label>
                  <Button
                    onClick={() => setShowCustomMetricForm(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Custom Metric
                  </Button>
                </div>
                
                {customMetrics.length > 0 && (
                  <div className="space-y-2">
                    {customMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{metric.name}</div>
                          <div className="text-sm text-muted-foreground">{metric.description}</div>
                        </div>
                        <Button
                          onClick={() => removeCustomMetric(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {showCustomMetricForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add Custom Metric</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Metric Name</label>
                        <Input
                          value={newCustomMetric.name}
                          onChange={(e) => setNewCustomMetric(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., technical_accuracy"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={newCustomMetric.description}
                          onChange={(e) => setNewCustomMetric(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of what this metric measures"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={newCustomMetric.category}
                          onValueChange={(value) => setNewCustomMetric(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="answer_quality">Answer Quality</SelectItem>
                            <SelectItem value="context_quality">Context Quality</SelectItem>
                            <SelectItem value="faithfulness">Faithfulness</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Evaluation Prompt</label>
                        <Textarea
                          value={newCustomMetric.prompt}
                          onChange={(e) => setNewCustomMetric(prev => ({ ...prev, prompt: e.target.value }))}
                          placeholder="Enter the evaluation prompt. Use {question}, {answer}, {contexts} as placeholders."
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use placeholders: {'{question}'}, {'{answer}'}, {'{contexts}'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={addCustomMetric} disabled={!newCustomMetric.name || !newCustomMetric.description || !newCustomMetric.prompt}>
                          Add Metric
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCustomMetricForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {/* Question Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question..."
                className="flex-1"
              />
              <Button
                onClick={searchDocuments}
                disabled={searching || !question.trim()}
                className="gap-2"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </div>

          {/* Contexts Display */}
          {contexts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Retrieved Contexts ({contexts.length})</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {contexts.map((context, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-muted/20"
                  >
                    <p className="text-sm">{context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Generation */}
          {contexts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Generated Answer</label>
                <Button
                  onClick={generateAnswer}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer will be generated based on contexts..."
                rows={4}
              />
            </div>
          )}

          {/* Evaluation Button */}
          {question && answer && contexts.length > 0 && (
            <Button
              onClick={evaluateRAG}
              disabled={evaluating}
              className="w-full gap-2"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {evaluating ? 'Evaluating...' : 'Evaluate RAG Performance'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Evaluation Results */}
      {evaluations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evaluations List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evaluation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation.evaluationId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvaluation?.evaluationId === evaluation.evaluationId
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedEvaluation(evaluation)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium line-clamp-1">
                        {evaluation.question}
                      </p>
                      <Badge className={getScoreBadgeColor(evaluation.scores.overallScore)}>
                        {(evaluation.scores.overallScore * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(evaluation.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Evaluation Details */}
          {selectedEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Evaluation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Score */}
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {(selectedEvaluation.scores.overallScore * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>

                {/* Individual Metrics */}
                <div className="space-y-3">
                  {Object.entries(selectedEvaluation.scores).map(([metricName, metricResult]) => {
                    if (metricName === 'overallScore') return null;
                    return (
                      <div key={metricName} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {metricName.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-sm font-bold ${getScoreColor(metricResult.score)}`}>
                            {(metricResult.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={metricResult.score * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">{metricResult.explanation}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Question and Answer */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Question:</p>
                    <p className="text-sm text-muted-foreground">{selectedEvaluation.question}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Answer:</p>
                    <p className="text-sm text-muted-foreground">{selectedEvaluation.answer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default RAGEvaluation;
