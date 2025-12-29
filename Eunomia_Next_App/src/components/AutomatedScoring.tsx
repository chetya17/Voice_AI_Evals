import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Gavel, 
  Star, 
  Target, 
  CheckCircle, 
  Clock, 
  Loader2,
  TrendingUp,
  FileText,
  BarChart3,
  Thermometer,
  HelpCircle
} from "lucide-react";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { useDataPersistence } from "@/contexts/DataPersistenceContext";
import { useToast } from "@/hooks/use-toast";
import { SimulatedConversation } from "./ConversationSimulator";

interface ScoringMetric {
  name: string;
  description: string;
  totalPoints: number;
  rubrics: ScoringRubric[];
}

interface ScoringRubric {
  criterion: string;
  points: number;
  description: string;
}

interface ConversationScore {
  conversationId: string;
  testCase: string;
  metricScores: MetricScore[];
  averageScore: number;
}

interface MetricScore {
  metricName: string;
  score: number | null;
  maxScore: number;
  feedback: string;
  timestamp: Date;
}

interface AutomatedScoringProps {
  conversations: SimulatedConversation[];
  scoringMetrics: ScoringMetric[];
  chatbotType: string;
  systemPrompt: string;
  onScoringComplete: (scores: ConversationScore[]) => void;
}

const AutomatedScoring = ({ 
  conversations, 
  scoringMetrics, 
  chatbotType, 
  systemPrompt,
  onScoringComplete 
}: AutomatedScoringProps) => {
  const { apiKey } = useApiKey();
  const { currentSession, updateConversationScores } = useDataPersistence();
  const { toast } = useToast();
  const [conversationScores, setConversationScores] = useState<ConversationScore[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [completedConversations, setCompletedConversations] = useState(0);
  const [completedMetrics, setCompletedMetrics] = useState(0);
  const [selectedTemperature, setSelectedTemperature] = useState("0.1");
  
  // Use ref to track latest scores for callback
  const latestScoresRef = useRef<ConversationScore[]>([]);

  // Temperature options for reproducibility control
  const temperatureOptions = [
    {
      value: "0.1",
      label: "Maximum Reproducibility",
      description: "Most consistent results, minimal variation",
      color: "text-green-600"
    },
    {
      value: "0.3",
      label: "High Reproducibility", 
      description: "Very consistent with slight variation",
      color: "text-blue-600"
    },
    {
      value: "0.5",
      label: "Balanced",
      description: "Good balance of consistency and creativity",
      color: "text-yellow-600"
    },
    {
      value: "0.7",
      label: "Creative Evaluation",
      description: "More varied responses, less predictable",
      color: "text-orange-600"
    }
  ];

  const totalScoringTasks = conversations.length * scoringMetrics.length;

  useEffect(() => {
    // Initialize conversation scores or load from existing session
    if (currentSession && currentSession.conversationScores.length > 0) {
      // Load existing scores from session
      setConversationScores(currentSession.conversationScores);
    } else {
      // Initialize new conversation scores
      const initialScores = conversations.map(conv => ({
        conversationId: conv.id,
        testCase: conv.testCase,
        metricScores: [],
        averageScore: 0
      }));
      setConversationScores(initialScores);
    }
  }, [conversations, currentSession]);

  const scoreConversation = async (conversation: SimulatedConversation, metric: ScoringMetric): Promise<MetricScore> => {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const conversationText = conversation.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // First attempt with the improved prompt and retry logic
    const initialResult = await attemptScoring(conversationText, metric, false, 3);
    
    // If the result is "Not Applicable", try again with an even more lenient prompt
    if (initialResult.score === null) {
      console.log(`Initial scoring returned "Not Applicable" for metric "${metric.name}". Attempting fallback scoring...`);
      const fallbackResult = await attemptScoring(conversationText, metric, true, 3);
      
      // Use fallback result if it provides a score, otherwise use the original
      if (fallbackResult.score !== null) {
        console.log(`Fallback scoring succeeded for metric "${metric.name}"`);
        return fallbackResult;
      } else {
        console.log(`Fallback scoring also returned "Not Applicable" for metric "${metric.name}"`);
        return initialResult;
      }
    }
    
    return initialResult;
  };

  const attemptScoring = async (conversationText: string, metric: ScoringMetric, isFallback: boolean, maxRetries: number = 3): Promise<MetricScore> => {
    const prompt = isFallback ? 
      createFallbackPrompt(conversationText, metric) : 
      createMainPrompt(conversationText, metric);

    // Define JSON schema for scoring response
    const scoringSchema = {
      type: "OBJECT",
      properties: {
        score: {
          oneOf: [
            { type: "NUMBER" },
            { type: "STRING" }
          ]
        },
        feedback: { type: "STRING" }
      },
      required: ["score", "feedback"]
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Scoring Attempt ${attempt}/${maxRetries} for metric: ${metric.name}`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: parseFloat(selectedTemperature),
              maxOutputTokens: 800,
              topP: 0.8,
              topK: 40,
              responseMimeType: "application/json",
              responseSchema: scoringSchema
            }
          })
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        // With structured output, the response should already be valid JSON
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(content);
        } catch (parseError) {
          console.error(`Failed to parse structured LLM response as JSON (Attempt ${attempt}):`, parseError);
          console.log(`Raw response:`, content);
          
          // Fallback: try to clean and parse if structured output failed
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          try {
            parsedResponse = JSON.parse(cleanContent);
          } catch (secondParseError) {
            console.error(`Failed to parse cleaned response as JSON (Attempt ${attempt}):`, secondParseError);
            
            // Last resort: try to extract score and feedback from the raw text
            const scoreMatch = cleanContent.match(/"score":\s*([^,}\s]+)/);
            const feedbackMatch = cleanContent.match(/"feedback":\s*"([^"]+)"/);
            
            if (scoreMatch && feedbackMatch) {
              parsedResponse = {
                score: scoreMatch[1],
                feedback: feedbackMatch[1]
              };
            } else {
              throw new Error(`Could not extract score and feedback from LLM response`);
            }
          }
        }
    
        // Handle "Not Applicable" case with improved parsing
        let finalScore: number | null = null;
        const scoreValue = parsedResponse.score;
        
        // Check for various forms of "Not Applicable"
        const notApplicableVariants = [
          "Not Applicable", "Not applicable", "not applicable", "NOT APPLICABLE",
          "N/A", "n/a", "NA", "na", "Not relevant", "not relevant", "NOT RELEVANT",
          "Not applicable to this conversation", "Not applicable to conversation",
          "This metric is not applicable", "Metric not applicable"
        ];
        
        const isNotApplicable = notApplicableVariants.some(variant => 
          typeof scoreValue === 'string' && scoreValue.toLowerCase().includes(variant.toLowerCase())
        );
        
        if (isNotApplicable) {
          finalScore = null;
        } else {
          finalScore = parseFloat(scoreValue);
          if (isNaN(finalScore)) {
            console.error(`Invalid score value: ${scoreValue}`);
            throw new Error(`Invalid score value: ${scoreValue}`);
          }
          
          // Additional check: if score is 0 and feedback suggests irrelevance, treat as Not Applicable
          if (finalScore === 0) {
            const feedback = parsedResponse.feedback?.toLowerCase() || '';
            const irrelevanceIndicators = [
              'not applicable', 'not relevant', 'does not apply', 'cannot be evaluated',
              'no relevant content', 'lacks context', 'different topic', 'unrelated',
              'not suitable', 'inappropriate', 'not designed for'
            ];
            
            const suggestsIrrelevance = irrelevanceIndicators.some(indicator => 
              feedback.includes(indicator)
            );
            
            if (suggestsIrrelevance) {
              console.log(`Score of 0 with irrelevance feedback detected, treating as Not Applicable`);
              finalScore = null;
            }
          }
        }
        
        const result: MetricScore = {
          metricName: metric.name,
          score: finalScore,
          maxScore: metric.totalPoints,
          feedback: parsedResponse.feedback,
          timestamp: new Date()
        };
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Scoring failed (Attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Retrying scoring in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw new Error(`Scoring failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  };

  const createMainPrompt = (conversationText: string, metric: ScoringMetric): string => {
    return `You are an expert AI evaluator tasked with scoring a chatbot conversation based on specific criteria.

CHATBOT CONTEXT:
- Type: ${chatbotType}
- System Prompt: "${systemPrompt}"

SCORING METRIC: ${metric.name}
Description: ${metric.description}

EVALUATION CRITERIA:
${metric.rubrics.map(rubric => 
  `- ${rubric.criterion}: ${rubric.points} points - ${rubric.description}`
).join('\n')}

CONVERSATION TO EVALUATE:
${conversationText}

SCORING GUIDANCE:
- Most conversation quality metrics can be evaluated from meaningful conversations
- Focus on what the assistant did well or poorly
- If unsure about relevance, err on the side of providing a score rather than "Not Applicable"
- Only use "Not Applicable" for truly irrelevant scenarios (e.g., metrics like tracking sales and support functionality of a chatbot on a conversation about a different topic)

RELEVANCE CHECK (Use "Not Applicable" ONLY in these cases):
- The conversation provides NO meaningful context to evaluate this metric
- The conversation is completely unrelated to any reasonable evaluation context (e.g., testing a customer service bot with pure mathematical equations)
- The conversation is too short or incoherent to make any meaningful assessment
- The metric requires specific domain knowledge that the conversation doesn't provide AND cannot be reasonably inferred

IMPORTANT: Most general conversation metrics (accuracy, helpfulness, professionalism, communication quality) can be evaluated from any conversation where the assistant responds to a user. Be generous in your relevance assessment.

TASK: 
1. Determine if this metric can be meaningfully evaluated from this conversation
2. If EVALUABLE: Provide a score from 0.0 to ${metric.totalPoints} with detailed feedback
3. If NOT EVALUABLE: Return "Not Applicable" with clear explanation

Return your response as a JSON object with "score" (number or "Not Applicable") and "feedback" (string) fields.

Be objective, fair, and thorough in your evaluation. Consider the chatbot's role, the user's needs, and how well the conversation addresses the test case.`;
  };

  const createFallbackPrompt = (conversationText: string, metric: ScoringMetric): string => {
    return `You are an expert AI evaluator tasked with scoring a chatbot conversation. This is a FALLBACK evaluation with more lenient criteria.

CHATBOT CONTEXT:
- Type: ${chatbotType}
- System Prompt: "${systemPrompt}"

SCORING METRIC: ${metric.name}
Description: ${metric.description}

EVALUATION CRITERIA:
${metric.rubrics.map(rubric => 
  `- ${rubric.criterion}: ${rubric.points} points - ${rubric.description}`
).join('\n')}

CONVERSATION TO EVALUATE:
${conversationText}

FALLBACK SCORING GUIDANCE:
- This is a more lenient evaluation - try to find some way this metric could apply to the conversation
- Even if the connection is slightly tenuous, provide a score based on what you can observe
- Focus on the assistant's performance 
- Only return "Not Applicable" if the conversation is completely incoherent or the metric is truly impossible to evaluate
- Consider partial applicability - if the metric partially applies, score based on the applicable aspects

IMPORTANT: In this fallback evaluation, be extremely generous about relevance. Most metrics about conversation quality, communication, or general performance can be evaluated from any meaningful conversation.

TASK: 
1. Try to find ANY way this metric could apply to this conversation
2. If you can find ANY applicable aspect: Provide a score from 0.0 to ${metric.totalPoints} with detailed feedback
3. If truly impossible to evaluate: Return "Not Applicable" with clear explanation

Return your response as a JSON object with "score" (number or "Not Applicable") and "feedback" (string) fields.

Be objective, fair, and thorough in your evaluation. Consider the chatbot's role, the user's needs, and how well the conversation addresses the test case.`;
  };

  const startScoring = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your API key to start automated scoring.",
        variant: "destructive",
      });
      return;
    }

    setIsScoring(true);
    setCurrentConversationIndex(0);
    setCurrentMetricIndex(0);
    setCompletedConversations(0);
    setCompletedMetrics(0);
    setScoringProgress(0);

    try {
      // Score each conversation for each metric
      for (let convIndex = 0; convIndex < conversations.length; convIndex++) {
        setCurrentConversationIndex(convIndex);
        const conversation = conversations[convIndex];
        
        for (let metricIndex = 0; metricIndex < scoringMetrics.length; metricIndex++) {
          setCurrentMetricIndex(metricIndex);
          const metric = scoringMetrics[metricIndex];
          
          try {
            const metricScore = await scoreConversation(conversation, metric);
            
            // Update conversation scores
            setConversationScores(prev => {
              const updated = prev.map(convScore => {
                if (convScore.conversationId === conversation.id) {
                  const updatedMetricScores = [...convScore.metricScores, metricScore];
                  const validScores = updatedMetricScores.filter(ms => ms.score !== null);
                  const averageScore = validScores.length > 0 ? validScores.reduce((sum, ms) => sum + ms.score, 0) / validScores.length : 0;
                  
                  return {
                    ...convScore,
                    metricScores: updatedMetricScores,
                    averageScore
                  };
                }
                return convScore;
              });
              
              // Update ref with latest scores
              latestScoresRef.current = updated;
              return updated;
            });
            
            setCompletedMetrics(prev => prev + 1);
            const progress = ((convIndex * scoringMetrics.length + metricIndex + 1) / totalScoringTasks) * 100;
            setScoringProgress(progress);
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.error(`Error scoring conversation ${convIndex} for metric ${metric.name}:`, error);
            
            // Add fallback score
            const fallbackScore: MetricScore = {
              metricName: metric.name,
              score: null, // Mark as "Not Applicable" when scoring fails
              maxScore: metric.totalPoints,
              feedback: `Scoring failed for this metric. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date()
            };
            
            setConversationScores(prev => {
              const updated = prev.map(convScore => {
                if (convScore.conversationId === conversation.id) {
                  const updatedMetricScores = [...convScore.metricScores, fallbackScore];
                  const validScores = updatedMetricScores.filter(ms => ms.score !== null);
                  const averageScore = validScores.length > 0 ? validScores.reduce((sum, ms) => sum + ms.score, 0) / validScores.length : 0;
                  
                  return {
                    ...convScore,
                    metricScores: updatedMetricScores,
                    averageScore
                  };
                }
                return convScore;
              });
              
              // Update ref with latest scores
              latestScoresRef.current = updated;
              return updated;
            });
          }
        }
        
        setCompletedConversations(prev => prev + 1);
      }
      
      toast({
        title: "Scoring Complete",
        description: "All conversations have been scored successfully.",
        variant: "default",
      });
      
      // Update session and notify parent component
      updateConversationScores(latestScoresRef.current);
      onScoringComplete(latestScoresRef.current);
      
    } catch (error) {
      console.error('Error during automated scoring:', error);
      toast({
        title: "Scoring Error",
        description: "An error occurred during automated scoring. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const getCurrentTask = () => {
    if (!isScoring) return null;
    
    const conversation = conversations[currentConversationIndex];
    const metric = scoringMetrics[currentMetricIndex];
    
    if (!conversation || !metric) return null;
    
    return {
      conversation: conversation.testCase,
      metric: metric.name,
      progress: `${currentConversationIndex + 1}/${conversations.length} conversations, ${currentMetricIndex + 1}/${scoringMetrics.length} metrics`
    };
  };

  const getOverallProgress = () => {
    if (totalScoringTasks === 0) return 0;
    return (completedMetrics / totalScoringTasks) * 100;
  };

  const currentTask = getCurrentTask();

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Automated Scoring</h2>
          <p className="text-muted-foreground">
            {conversations.length > 0 
              ? `Scoring ${conversations.length} conversations across ${scoringMetrics.length} metrics`
              : "No conversations available for scoring"
            }
          </p>
        </div>
        <Button
          onClick={startScoring}
          disabled={isScoring || !apiKey || conversations.length === 0}
          className="btn-hero gap-2"
        >
          {isScoring ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scoring...
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4" />
              Start Automated Scoring
            </>
          )}
        </Button>
      </div>

      {/* Temperature Selection */}
      {conversations.length > 0 && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary" />
              Evaluation Reproducibility
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Lower temperature = more consistent, reproducible scores. Higher temperature = more varied, creative evaluations.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how reproducible you want the evaluation scores to be. This affects the consistency of scoring results.
              </p>
              <RadioGroup
                value={selectedTemperature}
                onValueChange={setSelectedTemperature}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {temperatureOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${option.color}`}>{option.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {option.value}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </Label>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {conversations.length === 0 ? (
        <Card className="metric-card">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations available for scoring</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please complete conversation simulation first
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Scoring Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{completedMetrics}</p>
              <p className="text-sm text-muted-foreground">Completed Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completedConversations}</p>
              <p className="text-sm text-muted-foreground">Completed Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{totalScoringTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>
          
          {isScoring && currentTask && (
            <div className="bg-muted/20 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Currently scoring...
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Conversation:</strong> {currentTask.conversation}</p>
                <p><strong>Metric:</strong> {currentTask.metric}</p>
                <p><strong>Progress:</strong> {currentTask.progress}</p>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Scoring Metrics Overview */}
      {scoringMetrics.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Scoring Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scoringMetrics.map((metric, index) => (
              <div key={index} className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{metric.name}</h4>
                  <Badge variant="outline">{metric.totalPoints} pts</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{metric.description}</p>
                <div className="text-xs text-muted-foreground">
                  {metric.rubrics.length} criteria
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        </Card>
      )}

      {/* Current Results Preview */}
      {conversations.length > 0 && conversationScores.length > 0 && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Scoring Results Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversationScores.slice(0, 3).map((convScore, index) => (
                <div key={convScore.conversationId} className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Test Case {index + 1}</h4>
                    <Badge variant="default">
                      {convScore.averageScore.toFixed(2)} avg
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {convScore.testCase}
                  </p>
                  
                  {convScore.metricScores.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {convScore.metricScores.map((metricScore, msIndex) => (
                        <div key={msIndex} className="flex items-center justify-between text-xs">
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
                  )}
                </div>
              ))}
              
              {conversationScores.length > 3 && (
                <div className="text-center text-sm text-muted-foreground">
                  +{conversationScores.length - 3} more conversations...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {conversations.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The automated scoring system uses separate LLM instances to evaluate each conversation 
            against each scoring metric independently. This ensures unbiased and thorough evaluation.
          </p>
          <p>
            Each LLM instance receives the conversation context, the specific metric criteria, 
            and detailed rubrics to provide accurate scores and feedback.
          </p>
          <p>
            Scores are calculated based on the rubrics and stored for later analysis and compilation.
          </p>
        </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomatedScoring;
