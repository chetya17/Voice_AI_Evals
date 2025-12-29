import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot, 
  Settings2, 
  MessageSquare,
  Target,
  Play,
  Wand2,
  Users,
  Clock,
  Key,
  Plus,
  X,
  Star,
  Trash2,
  Edit3,
  Upload,
  FileText,
  Download,
  Globe,
  Check
} from "lucide-react";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { useDataPersistence, TestConfig } from "@/contexts/DataPersistenceContext";
import { useToast } from "@/hooks/use-toast";
import CurlTokenExtractor from "./CurlTokenExtractor";
import React from "react";

/*
 * LLM API INTEGRATION GUIDE:
 * 
 * To connect to real LLM APIs (OpenAI, Anthropic, etc.):
 * 
 * 1. Replace the callLLMAPI function with your actual API call:
 *    - OpenAI: Use fetch() to call https://api.openai.com/v1/chat/completions
 *    - Anthropic: Use fetch() to call https://api.anthropic.com/v1/messages
 *    - Other providers: Use their respective API endpoints
 * 
 * 2. Update the API key handling in the callLLMAPI function
 * 3. Parse the response format from your chosen LLM provider
 * 4. Ensure the response follows the expected ScoringMetric[] structure
 * 
 * The elaborate prompts are already designed to work with most LLM providers.
 */

interface TestConfigurationProps {
  onStartTest: (config: Omit<TestConfig, 'apiKey'>) => void;
}



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

const TestConfiguration = ({ onStartTest }: TestConfigurationProps) => {
  const { apiKey, setApiKey } = useApiKey();
  const { currentSession, updateTestConfig } = useDataPersistence();
  const { toast } = useToast();
  const [localApiKeyInput, setLocalApiKeyInput] = useState(apiKey);
  const [testCases, setTestCases] = useState(5);
  const [conversationTurns, setConversationTurns] = useState([3]);
  const [conversationMode, setConversationMode] = useState<'fixed' | 'range' | 'auto'>('fixed');
  const [conversationRange, setConversationRange] = useState({ min: 2, max: 5 });
  const [endpointUrl, setEndpointUrl] = useState("https://chetantalele.graphy.com/t/api/ai/chat-threads/messages/stream");
  // Remove isEndpointSet state - we'll derive this from endpointUrl
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  
  // Derive isEndpointSet from endpointUrl
  const isEndpointSet = !!endpointUrl && endpointUrl.trim() !== "";
  const hasLoadedInitialConfig = useRef(false);
  
  // State for curl token extraction
  const [extractedToken, setExtractedToken] = useState<string | null>(null);
  const [extractedHeaders, setExtractedHeaders] = useState<Record<string, string>>({});
  const [extractedCookies, setExtractedCookies] = useState<Record<string, string>>({});
  const [isTokenExtracted, setIsTokenExtracted] = useState(false);
  const [customMetrics, setCustomMetrics] = useState([
    "Response Accuracy",
    "Helpfulness", 
    "Professionalism",
    "Problem Resolution",
    "User Satisfaction"
  ]);
  const [newMetric, setNewMetric] = useState("");
  
  // New state for test case management
  const [generatedTestCases, setGeneratedTestCases] = useState<string[]>([]);
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false);
  const [customTestCase, setCustomTestCase] = useState("");
  const [showTestCases, setShowTestCases] = useState(false);

  // New state for scoring metrics with rubrics
  const [scoringMetrics, setScoringMetrics] = useState<ScoringMetric[]>([]);
  const [showScoringMetrics, setShowScoringMetrics] = useState(false);
  const [isGeneratingScoringMetrics, setIsGeneratingScoringMetrics] = useState(false);
  const [newCustomMetricName, setNewCustomMetricName] = useState("");
  const [isGeneratingCustomMetric, setIsGeneratingCustomMetric] = useState(false);

  // New state for CSV upload
  const [uploadedTestCases, setUploadedTestCases] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [useUploadedTestCases, setUseUploadedTestCases] = useState(false);
  const [isGeneratingFromUploaded, setIsGeneratingFromUploaded] = useState(false);
  const [showUploadedTestCases, setShowUploadedTestCases] = useState(false);

  // New state for agent type
  const [agentType, setAgentType] = useState("");
  const [isGeneratingGuidelines, setIsGeneratingGuidelines] = useState(false);
  const [guidelines, setGuidelines] = useState({
    testCaseGuideline: "",
    scoringGuideline: "",
    simulationGuideline: ""
  });
  const [editingGuideline, setEditingGuideline] = useState<string | null>(null);
  const [editingGuidelineValue, setEditingGuidelineValue] = useState("");

  // New state for RAG evaluation mode
  const [evaluationMode, setEvaluationMode] = useState<'non-rag' | 'rag' | 'both'>('non-rag');
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Update isApiKeySet when apiKey changes
  useEffect(() => {
    const hasApiKey = !!apiKey;
    setIsApiKeySet(hasApiKey);
    console.log('TestConfiguration: API key changed, isApiKeySet:', hasApiKey, 'apiKey:', apiKey ? '***' : 'none');
  }, [apiKey]);

  // Load existing configuration from current session (only once)
  useEffect(() => {
    if (currentSession && currentSession.testConfig && !hasLoadedInitialConfig.current) {
      hasLoadedInitialConfig.current = true;
      const config = currentSession.testConfig;
      console.log('TestConfiguration: Loading initial config from session:', config);
      console.log('TestConfiguration: endpointUrl from session:', config.endpointUrl);
      
      setTestCases(config.testCases || 5);
      setConversationTurns([config.conversationTurns || 3]);
      setConversationMode(config.conversationMode || 'fixed');
      setConversationRange(config.conversationRange || { min: 2, max: 5 });
      setEndpointUrl(config.endpointUrl || "https://chetantalele.graphy.com/t/api/ai/chat-threads/messages/stream");
      // isEndpointSet is now derived from endpointUrl
      
      setCustomMetrics(config.customMetrics || []);
      setScoringMetrics(config.scoringMetrics || []);
      setGeneratedTestCases(config.generatedTestCases || []);
      setUploadedTestCases(config.uploadedTestCases || []);
      setUseUploadedTestCases(config.useUploadedTestCases || false);
      setCsvFileName(config.csvFileName || "");
      setAgentType(config.agentType || "");
      setGuidelines(config.guidelines || {
        testCaseGuideline: "",
        scoringGuideline: "",
        simulationGuideline: ""
      });
    }
  }, [currentSession]);

  // Update local input when global API key changes
  React.useEffect(() => {
    setLocalApiKeyInput(apiKey);
  }, [apiKey]);

  const handleSetApiKey = () => {
    if (localApiKeyInput.trim()) {
      setApiKey(localApiKeyInput.trim());
      toast({
        title: "API Key Set",
        description: "Your API key has been successfully set and is now available for all operations.",
        variant: "default",
      });
    }
  };

  const handleApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalApiKeyInput(e.target.value);
  };

  // Handler for when token is extracted from curl command
  const handleTokenExtracted = (token: string, headers: Record<string, string>, cookies: Record<string, string>) => {
    setExtractedToken(token);
    setExtractedHeaders(headers);
    setExtractedCookies(cookies);
    setIsTokenExtracted(true);
    toast({
      title: "Token Extracted",
      description: "Authorization token and headers extracted successfully from curl command.",
      variant: "default",
    });
  };

  // Handler for when URL is extracted from curl command
  const handleUrlExtracted = (url: string) => {
    console.log('TestConfiguration: URL extracted from curl:', url);
    setEndpointUrl(url);
    // isEndpointSet is now derived from endpointUrl
    toast({
      title: "URL Updated",
      description: "Endpoint URL updated from curl command.",
      variant: "default",
    });
  };

  // Save configuration data to persistence context when user makes changes
  const saveConfiguration = useCallback(() => {
    if (currentSession) {
      const config = {
        chatbotType: 'remote-agent',
        systemPrompt: 'Remote agent endpoint',
        testCases: testCases,
        conversationMode,
        conversationRange,
        conversationTurns: conversationTurns[0],
        customMetrics,
        scoringMetrics,
        generatedTestCases,
        uploadedTestCases,
        csvFileName,
        useUploadedTestCases,
        chatbotMode: 'endpoint' as const,
        endpointUrl,
        isEndpointValid: !!endpointUrl,
        agentType,
        guidelines,
        authorizationToken: extractedToken || undefined,
        extractedHeaders,
        extractedCookies,
        timestamp: new Date()
      };
      
      console.log('TestConfiguration: Updating test config with endpointUrl:', endpointUrl);
      console.log('TestConfiguration: Full config:', config);
      
      // Update the test configuration in the persistence context
      updateTestConfig(config);
    }
  }, [
    currentSession, testCases, conversationMode, conversationRange, conversationTurns, 
    customMetrics, scoringMetrics, generatedTestCases, uploadedTestCases,
    csvFileName, useUploadedTestCases, endpointUrl, agentType, guidelines,
    extractedToken, extractedHeaders, extractedCookies
    // Removed updateTestConfig from dependencies to prevent infinite loop
  ]);

  // Disable automatic saving to prevent infinite loops
  // Configuration will be saved when user navigates to next step or clicks save




  const generateMetrics = async () => {
    if (!isApiKeySet) return;
    
    setIsGeneratingMetrics(true);
    
    try {
      // Create prompt for LLM to generate metrics
      const llmPrompt = `You are an expert in GenAI Evals. Generate 5-7(strictly more than 5) relevant evaluation metrics for testing a remote chatbot agent.

Purpose: Create evaluation criteria to assess the chatbot's performance and effectiveness

Requirements:
- Generate at least 5-7 specific, measurable metrics
- Focus on general chatbot competencies and user experience factors
- Make metrics relevant to any chatbot functionality
- Return only a JSON array of strings, no additional text

Example format: ["Metric 1", "Metric 2", "Metric 3"]

Generate metrics that would provide comprehensive evaluation of any chatbot's performance.`;
      
      // Call the LLM API to generate metrics
      const response = await callLLMAPI(llmPrompt);
      
      try {
        // Parse the response as JSON array of strings
        const parsedMetrics = JSON.parse(response);
        if (Array.isArray(parsedMetrics) && parsedMetrics.every(m => typeof m === 'string')) {
          setCustomMetrics(parsedMetrics);
          toast({
            title: "Metrics Generated",
          description: `Generated ${parsedMetrics.length} evaluation metrics for remote agent testing.`,
            variant: "default",
          });
        } else {
          throw new Error("Invalid response format");
        }
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        // Fallback to predefined metrics if parsing fails
        const fallbackMetrics = generateContextualMetrics('remote-agent');
        setCustomMetrics(fallbackMetrics);
        toast({
          title: "Metrics Generated (Fallback)",
          description: `Used fallback metrics for remote agent testing.`,
          variant: "default",
        });
      }
      
      console.log("Generated metrics for remote agent:", customMetrics);
    } catch (error) {
      console.error("Error generating metrics:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMetrics(false);
    }
  };

  const generateContextualMetrics = (type: string): string[] => {
    const metricTemplates = {
      "customer-support": [
        "Issue Resolution Speed",
        "Customer Satisfaction",
        "Technical Knowledge",
        "Communication Clarity",
        "Problem Escalation"
      ],
      "food-delivery": [
        "Order Accuracy",
        "Delivery Time Management",
        "Customer Complaint Handling",
        "Restaurant Information",
        "Payment Processing"
      ],
      "ecommerce": [
        "Product Knowledge",
        "Order Processing",
        "Return Policy Understanding",
        "Inventory Information",
        "Customer Support"
      ],
      "banking": [
        "Security Awareness",
        "Transaction Accuracy",
        "Account Information",
        "Financial Guidance",
        "Privacy Protection"
      ],
      "healthcare": [
        "Medical Information Accuracy",
        "Appointment Scheduling",
        "Patient Privacy",
        "Emergency Response",
        "Service Information"
      ],
      "travel": [
        "Destination Knowledge",
        "Booking Accuracy",
        "Travel Information",
        "Customer Service",
        "Problem Resolution"
      ],
      "education": [
        "Learning Resource Quality",
        "Course Information",
        "Student Guidance",
        "Academic Support",
        "Educational Content"
      ],
      "custom": [
        "Dummy scoring metric",
        "User Experience",
        "Task Completion",
        "Error Handling",
        "Customization Quality"
      ]
    };
    
    return metricTemplates[type as keyof typeof metricTemplates] || metricTemplates.custom;
  };

  const generateScoringMetrics = async () => {
    if (!isApiKeySet) {
      return;
    }
    
    setIsGeneratingScoringMetrics(true);
    
    try {
      // Add randomization elements to make scoring metrics generation less deterministic
      const randomElements = [
        "Consider both quantitative and qualitative performance aspects",
        "Focus on user experience and satisfaction metrics",
        "Include technical accuracy and communication effectiveness",
        "Think about both functional and non-functional requirements",
        "Consider different stakeholder perspectives and needs"
      ];
      
      const randomElement = randomElements[Math.floor(Math.random() * randomElements.length)];
      const randomSeed = Math.random().toString(36).substring(7);
      
      // Use guidelines if available, otherwise use default prompt
      const llmPrompt = guidelines.scoringGuideline ? 
        `${guidelines.scoringGuideline}

Based on this guideline, generate as many scoring metrics as you see fit for the AI agent described above. ${randomElement}

Agent Type: ${agentType}
Generation ID: ${randomSeed}

Return a JSON array with this exact format:
[
  {
    "name": "Response Accuracy",
    "description": "Measures how accurately the chatbot responds to user queries",
    "totalPoints": 1.0,
    "rubrics": [
      {
        "criterion": "Correct Information",
        "points": 0.4,
        "description": "Provides accurate and relevant information"
      },
      {
        "criterion": "Understanding",
        "points": 0.3,
        "description": "Correctly interprets user intent"
      },
      {
        "criterion": "Completeness",
        "points": 0.3,
        "description": "Addresses all aspects of the user's query"
      }
    ]
  }
]

Focus on metrics relevant to the agent type. Return only valid JSON.Also,ensure that you elaborate the meaning of every single criterion in the rubrics.` :
        createScoringMetricsPrompt('remote-agent', 'Remote agent endpoint');
      
      // Call the LLM API to generate scoring metrics
      const newScoringMetrics = await simulateLLMGeneration(llmPrompt);
      
      // Add predefined RAG metrics if RAG mode is selected
      if (evaluationMode === 'rag' || evaluationMode === 'both') {
        const ragMetrics: ScoringMetric[] = [
          {
            name: "Answer Relevancy",
            description: "Measures how relevant the answer is to the question",
            totalPoints: 1.0,
            rubrics: [
              {
                criterion: "Direct Addressing",
                points: 0.4,
                description: "Does the answer directly address the question asked?"
              },
              {
                criterion: "Completeness",
                points: 0.3,
                description: "Is the answer complete and comprehensive?"
              },
              {
                criterion: "Focus",
                points: 0.3,
                description: "Does the answer avoid irrelevant information?"
              }
            ]
          },
          {
            name: "Faithfulness",
            description: "Measures whether the answer is grounded in the provided document context",
            totalPoints: 1.0,
            rubrics: [
              {
                criterion: "Source Grounding",
                points: 0.4,
                description: "Are all claims in the answer supported by the document context?"
              },
              {
                criterion: "No Hallucination",
                points: 0.3,
                description: "Does the answer avoid fabricating information not in the documents?"
              },
              {
                criterion: "Accurate Representation",
                points: 0.3,
                description: "Does the answer accurately represent information from the documents?"
              }
            ]
          },
          {
            name: "Strict Faithfulness",
            description: "Strictly measures if answer contains ONLY information from provided contexts",
            totalPoints: 1.0,
            rubrics: [
              {
                criterion: "Exclusive Context Use",
                points: 1.0,
                description: "Answer contains ONLY information from provided contexts, no external knowledge"
              }
            ]
          },
          {
            name: "Context Precision",
            description: "Measures the precision of retrieved contexts for answering",
            totalPoints: 1.0,
            rubrics: [
              {
                criterion: "Relevance",
                points: 0.5,
                description: "Are the retrieved contexts relevant to answering the question?"
              },
              {
                criterion: "No Noise",
                points: 0.5,
                description: "Are irrelevant contexts minimized in the retrieval?"
              }
            ]
          },
          {
            name: "Answer Correctness",
            description: "Measures the factual correctness of the answer",
            totalPoints: 1.0,
            rubrics: [
              {
                criterion: "Factual Accuracy",
                points: 0.5,
                description: "Is the answer factually accurate based on the documents?"
              },
              {
                criterion: "Alignment",
                points: 0.5,
                description: "Does the answer align with the document information?"
              }
            ]
          }
        ];
        
        // Combine RAG metrics with generated metrics
        if (evaluationMode === 'rag') {
          setScoringMetrics(ragMetrics);
        } else {
          setScoringMetrics([...ragMetrics, ...newScoringMetrics]);
        }
      } else {
        setScoringMetrics(newScoringMetrics);
      }
      
      const metricsCount = evaluationMode === 'rag' ? 4 : (evaluationMode === 'both' ? 4 + newScoringMetrics.length : newScoringMetrics.length);
      
      toast({
        title: "Scoring Metrics Generated",
        description: `Generated ${metricsCount} scoring metrics${evaluationMode !== 'non-rag' ? ' (including RAG metrics)' : ''} with detailed rubrics.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating scoring metrics:", error);
      
      // Provide more specific error context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isParseError = errorMessage.includes('Failed to parse LLM response');
      
      toast({
        title: "Scoring Metrics Generation Failed",
        description: "Couldn't generate scoring metrics. Please start a new eval session.",
        variant: "destructive",
      });
      
      // If it's a parsing error, the fallback metrics should already be set
      if (!isParseError) {
        const fallbackMetrics = generateFallbackMetrics();
        setScoringMetrics(fallbackMetrics);
      }
    } finally {
      setIsGeneratingScoringMetrics(false);
    }
  };

  const createScoringMetricsPrompt = (chatbotType: string, systemPrompt: string): string => {
    // Add randomization elements to make scoring metrics generation less deterministic
    const randomElements = [
      "Consider both quantitative and qualitative performance aspects",
      "Focus on user experience and satisfaction metrics", 
      "Include technical accuracy and communication effectiveness",
      "Think about both functional and non-functional requirements",
      "Consider different stakeholder perspectives and needs",
      "Evaluate both immediate and long-term value",
      "Assess both explicit and implicit performance indicators",
      "Look at both process and outcome quality"
    ];
    
    const randomElement = randomElements[Math.floor(Math.random() * randomElements.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    
    return `Generate as many scoring metrics as you see fit for testing a remote chatbot agent. ${randomElement}

Purpose: Create evaluation criteria for remote agent testing
Generation ID: ${randomSeed}

Return a JSON array with this exact format:
[
  {
    "name": "Response Accuracy",
    "description": "Measures how accurately the chatbot responds to user queries",
    "totalPoints": 1.0,
    "rubrics": [
      {
        "criterion": "Correct Information",
        "points": 0.4,
        "description": "Provides accurate and relevant information"
      },
      {
        "criterion": "Understanding",
        "points": 0.3,
        "description": "Correctly interprets user intent"
      },
      {
        "criterion": "Completeness",
        "points": 0.3,
        "description": "Addresses all aspects of the user's query"
      }
    ]
  }
]

Focus on metrics relevant to general chatbot performance. Return only valid JSON.Also,ensure that you elaborate the meaning of every single criterion in the rubrics.`;
  };

  const callLLMAPI = async (prompt: string): Promise<string> => {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    
    console.log("LLM API Call - Prompt:", prompt);
    
    try {
      // Make actual API call to Gemini
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
                  text: `You are an expert in GenAI Evals. Return only valid JSON arrays. Do not include any additional text or explanations outside the JSON.

${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1500,
            topP: 0.95,
            topK: 50
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid Gemini API response format');
      }
      
      const content = data.candidates[0].content.parts[0].text;
      console.log('API Content:', content);
      
      return content;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  };

  const parseLLMResponse = (response: string): ScoringMetric[] => {
    try {
      console.log("Parsing LLM response:", response);
      
      // Clean the response - remove any markdown formatting
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log("Cleaned response:", cleanResponse);
      
      // Parse the JSON response from the LLM
      const parsed = JSON.parse(cleanResponse);
      console.log("Parsed response:", parsed);
      
      // Validate the structure
      if (!Array.isArray(parsed)) {
        throw new Error("LLM response is not an array");
      }
      
      // Validate each metric
      const validatedMetrics: ScoringMetric[] = parsed.map((metric, index) => {
        if (!metric.name || !metric.description || !metric.totalPoints || !Array.isArray(metric.rubrics)) {
          console.error("Invalid metric at index", index, ":", metric);
          throw new Error(`Invalid metric structure at index ${index}: missing required fields`);
        }
        
         // Validate rubrics
         const validatedRubrics = metric.rubrics.map((rubric: any, rubricIndex: number) => {
           if (!rubric.criterion || typeof rubric.points !== 'number' || !rubric.description) {
             console.error("Invalid rubric at metric", index, "rubric", rubricIndex, ":", rubric);
             throw new Error(`Invalid rubric structure at metric ${index}, rubric ${rubricIndex}: missing required fields`);
           }
           return rubric;
         });
         
         // Validate total points sum to 1.0
         const totalPoints = validatedRubrics.reduce((sum: number, rubric: any) => sum + rubric.points, 0);
         if (Math.abs(totalPoints - 1.0) > 0.01) {
           console.warn(`Metric "${metric.name}" points don't sum to 1.0 (got ${totalPoints}), normalizing...`);
           // Normalize points to sum to 1.0
           validatedRubrics.forEach((rubric: any) => {
             rubric.points = rubric.points / totalPoints;
           });
         }
        
        return {
          name: metric.name,
          description: metric.description,
          totalPoints: 1.0,
          rubrics: validatedRubrics
        };
      });
      
      console.log("Validated metrics:", validatedMetrics);
      return validatedMetrics;
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      console.error("Raw response was:", response);
      
      // Try one more time with basic cleanup
      try {
        let cleaned = response.trim();
        // Remove markdown
        if (cleaned.includes('```')) {
          const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleaned = jsonMatch[1].trim();
          }
        }
        
        // Fix common issues
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); // Add quotes around keys
        
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) {
          throw new Error("LLM response is not an array");
        }
        
        // Validate each metric
        const validatedMetrics: ScoringMetric[] = parsed.map((metric: any, index: number) => {
          if (!metric.name || !metric.description || !metric.totalPoints || !Array.isArray(metric.rubrics)) {
            console.error("Invalid metric at index", index, ":", metric);
            throw new Error(`Invalid metric structure at index ${index}: missing required fields`);
          }
          
           // Validate rubrics
           const validatedRubrics = metric.rubrics.map((rubric: any, rubricIndex: number) => {
             if (!rubric.criterion || typeof rubric.points !== 'number' || !rubric.description) {
               console.error("Invalid rubric at metric", index, "rubric", rubricIndex, ":", rubric);
               throw new Error(`Invalid rubric structure at metric ${index}, rubric ${rubricIndex}: missing required fields`);
             }
             return rubric;
           });
           
           // Validate total points sum to 1.0
           const totalPoints = validatedRubrics.reduce((sum: number, rubric: any) => sum + rubric.points, 0);
           if (Math.abs(totalPoints - 1.0) > 0.01) {
             console.warn(`Metric "${metric.name}" points don't sum to 1.0 (got ${totalPoints}), normalizing...`);
             // Normalize points to sum to 1.0
             validatedRubrics.forEach((rubric: any) => {
               rubric.points = rubric.points / totalPoints;
             });
           }
          
          return {
            name: metric.name,
            description: metric.description,
            totalPoints: 1.0,
            rubrics: validatedRubrics
          };
        });
        
        console.log("Validated metrics (second attempt):", validatedMetrics);
        return validatedMetrics;
      } catch (secondError) {
        console.error("Second parsing attempt also failed:", secondError);
        throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const simulateLLMGeneration = async (prompt: string): Promise<ScoringMetric[]> => {
    // This function now actually calls the LLM API instead of returning mock data
    try {
      const response = await callLLMAPI(prompt);
      return parseLLMResponse(response);
    } catch (error) {
      console.error("LLM generation failed:", error);
      
      // Generate fallback metrics based on chatbot type
      const fallbackMetrics = generateFallbackMetrics();
      console.log("Using fallback metrics:", fallbackMetrics);
      
      return fallbackMetrics;
    }
  };

  const generateFallbackMetrics = (): ScoringMetric[] => {
    const fallbackTemplates = {
      "customer-support": [
        {
          name: "Customer Satisfaction",
          description: "Measures overall customer satisfaction with support interactions",
          totalPoints: 1.0,
          rubrics: [
            { criterion: "Helpfulness", points: 0.4, description: "Provides helpful and relevant assistance" },
            { criterion: "Professionalism", points: 0.3, description: "Maintains professional and courteous tone" },
            { criterion: "Problem Resolution", points: 0.3, description: "Effectively resolves customer issues" }
          ]
        },
        {
          name: "Response Quality",
          description: "Evaluates the quality and accuracy of responses",
          totalPoints: 1.0,
          rubrics: [
            { criterion: "Accuracy", points: 0.5, description: "Provides accurate information" },
            { criterion: "Clarity", points: 0.3, description: "Communicates clearly and understandably" },
            { criterion: "Completeness", points: 0.2, description: "Addresses all aspects of the query" }
          ]
        }
      ],
      "food-delivery": [
        {
          name: "Order Management",
          description: "Assesses effectiveness in handling food orders",
          totalPoints: 1.0,
          rubrics: [
            { criterion: "Order Accuracy", points: 0.4, description: "Correctly processes order details" },
            { criterion: "Efficiency", points: 0.3, description: "Handles orders quickly and efficiently" },
            { criterion: "Customer Service", points: 0.3, description: "Provides good customer service" }
          ]
        }
      ],
      "ecommerce": [
        {
          name: "Shopping Assistance",
          description: "Evaluates help with shopping and product selection",
          totalPoints: 1.0,
          rubrics: [
            { criterion: "Product Knowledge", points: 0.4, description: "Demonstrates knowledge of products" },
            { criterion: "Recommendations", points: 0.3, description: "Provides helpful recommendations" },
            { criterion: "User Guidance", points: 0.3, description: "Guides users through shopping process" }
          ]
        }
      ]
    };
    
    return fallbackTemplates["customer-support"];
  };

  const createCustomMetricPrompt = (metricName: string): string => {
    // Add randomization elements to make custom metric generation less deterministic
    const randomElements = [
      "Consider both quantitative and qualitative aspects of this metric",
      "Focus on measurable and observable behaviors",
      "Think about different user perspectives and contexts",
      "Include both process and outcome indicators",
      "Consider both immediate and long-term impacts",
      "Assess both explicit and implicit performance signals",
      "Look at both individual and systemic performance",
      "Evaluate both technical and human-centered aspects"
    ];
    
    const randomElement = randomElements[Math.floor(Math.random() * randomElements.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    
    return `You are an expert in GenAI Evals and assessment. Your task is to generate a custom scoring metric with detailed rubrics for evaluating a chatbot. ${randomElement}

CONTEXT:
- Custom Metric Name: "${metricName}"
- Purpose: Create a specialized evaluation criterion that measures "${metricName}" for chatbot performance
- Generation ID: ${randomSeed}

REQUIREMENTS:
1. Generate 1 custom scoring metric with the exact name "${metricName}"
2. The metric should have a total score of 1.0 (100%)
3. Include 4-5 detailed rubrics with specific point allocations
4. Focus on measuring the specific aspect: "${metricName}"
5. Ensure rubrics are measurable, objective, and actionable

SCORING METRIC STRUCTURE:
The metric should follow this format:
- name: "${metricName}" (exact match)
- description: Detailed explanation of what this metric measures
- totalPoints: 1.0
- rubrics: Array of 4-5 criteria with point allocations that sum to 1.0

RUBRIC STRUCTURE:
Each rubric should include:
- criterion: Specific, measurable criterion name
- points: Decimal points (e.g., 0.2, 0.3) that sum to 1.0 for the metric
- description: Clear explanation of what constitutes success for this criterion

OUTPUT FORMAT:
Return a single ScoringMetric object with this exact structure:
{
  "name": "${metricName}",
  "description": "Detailed description of what this metric measures",
  "totalPoints": 1.0,
  "rubrics": [
    {
      "criterion": "Specific criterion name",
      "points": 0.2,
      "description": "Clear description of what constitutes success"
    }
  ]
}

IMPORTANT:
- Ensure all point allocations sum exactly to 1.0
- Make criteria specific and measurable, not vague
- Focus on the specific aspect: "${metricName}"
- Consider both functional and non-functional aspects
- Make the metric relevant to GenAI Evals

Generate a comprehensive custom metric for "${metricName}" that would provide valuable evaluation criteria for chatbot performance.`;
  };

  const simulateCustomMetricGeneration = async (prompt: string): Promise<ScoringMetric> => {
    // This function now actually calls the LLM API instead of returning mock data
    try {
      const response = await callLLMAPI(prompt);
      const metrics = parseLLMResponse(response);
      
      // For custom metrics, we expect only one metric
      if (metrics.length > 0) {
        return metrics[0];
      } else {
        throw new Error("No metrics generated");
      }
    } catch (error) {
      console.error("Custom metric LLM generation failed:", error);
      // Fallback to a basic custom metric if LLM fails
      const metricNameMatch = prompt.match(/Custom Metric Name: "([^"]+)"/);
      const metricName = metricNameMatch ? metricNameMatch[1] : "Custom Metric";
      
      return {
        name: metricName,
        description: `Custom evaluation metric for ${metricName} - assesses the chatbot's performance in this specific area`,
        totalPoints: 1.0,
        rubrics: [
          { criterion: "Basic Understanding", points: 0.25, description: `Demonstrates understanding of ${metricName} concepts` },
          { criterion: "Implementation Quality", points: 0.30, description: `Shows quality in ${metricName} implementation` },
          { criterion: "User Benefit", points: 0.25, description: `Provides clear benefit to users through ${metricName}` },
          { criterion: "Overall Effectiveness", points: 0.20, description: `Overall effectiveness in ${metricName} area` }
        ]
      };
    }
  };

  const generateCustomScoringMetric = async () => {
    if (!newCustomMetricName.trim() || !isApiKeySet) return;
    
    setIsGeneratingCustomMetric(true);
    
    try {
      // Create custom metric prompt for LLM
      const customMetricPrompt = createCustomMetricPrompt(newCustomMetricName.trim());
      
      // Call the LLM API to generate custom metric
      const customMetric = await simulateCustomMetricGeneration(customMetricPrompt);
      
      setScoringMetrics([...scoringMetrics, customMetric]);
      setNewCustomMetricName("");
      
      toast({
        title: "Custom Metric Generated",
        description: `Generated custom scoring metric "${customMetric.name}" with detailed rubrics.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error("Error generating custom metric:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate custom metric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCustomMetric(false);
    }
  };

  const removeScoringMetric = (index: number) => {
    const removedMetric = scoringMetrics[index];
    setScoringMetrics(scoringMetrics.filter((_, i) => i !== index));
    
    toast({
      title: "Metric Removed",
      description: `Removed scoring metric "${removedMetric.name}".`,
      variant: "default",
    });
  };

  const generateTestCases = async () => {
    if (!isApiKeySet) return;
    
    setIsGeneratingTestCases(true);
    
    try {
      // Check if RAG mode is selected and documents are uploaded
      if ((evaluationMode === 'rag' || evaluationMode === 'both') && uploadedDocuments.length > 0) {
        // Generate document-based test cases for RAG evaluation
        const response = await fetch('/api/documents/generate-test-cases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('user-id') || 'unknown'
          },
          body: JSON.stringify({
            sessionId: currentSession?.sessionId,
            testCaseCount: testCases,
            documentIds: uploadedDocuments.map(doc => doc.documentId)
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setGeneratedTestCases(result.data.testCases);
          setShowTestCases(true);
          toast({
            title: "Document-Based Test Cases Generated",
            description: `Generated ${result.data.testCases.length} test cases based on ${result.data.documentCount} uploaded documents.`,
            variant: "default",
          });
          return;
        } else {
          throw new Error(result.error || 'Failed to generate document-based test cases');
        }
      }
      
      // Fallback to standard test case generation
      // Add randomization elements to make test case generation less deterministic
      const randomElements = [
        "Focus on diverse user personas and interaction styles",
        "Consider various complexity levels and user expertise",
        "Include both common and uncommon use cases",
        "Think about different emotional states and contexts",
        "Explore various communication patterns and preferences"
      ];
      
      const randomElement = randomElements[Math.floor(Math.random() * randomElements.length)];
      const randomSeed = Math.random().toString(36).substring(7);
      
      // Use guidelines if available, otherwise use default prompt
      const guidelineText = guidelines.testCaseGuideline || 
         `You are an expert in chatbot testing. Generate ${testCases} realistic test scenarios for testing a remote chatbot agent. ${randomElement}

Number of Test Cases: ${testCases}
Purpose: Create diverse test scenarios that cover various user interactions and edge cases
Generation ID: ${randomSeed}

Requirements:
- Generate exactly ${testCases} test scenarios
- Make scenarios realistic and relevant to general chatbot functionality
- STRICTLY GENERATE AT LEAST HALF OF ${testCases} extreme edge cases. Meaning,if the test cases are 5,you must generate at least 3 edge cases.
- Focus on user interactions that would test the chatbot's capabilities
- Return only a JSON array of strings, no additional text. DO NOT ADD BACKTICKS or the word json TO THE TEST CASES

Example format: ["Test scenario 1", "Test scenario 2", "Test scenario 3"]

Generate test scenarios that would thoroughly evaluate any chatbot's performance.`;

      const llmPrompt = guidelines.testCaseGuideline ? 
        `${guidelineText}

Based on this guideline, generate exactly ${testCases} test scenarios for the AI agent described above.

Agent Type: ${agentType}
Generation ID: ${randomSeed}

Return only a JSON array of strings, no additional text. DO NOT ADD BACKTICKS or the word json TO THE TEST CASES

Example format: ["Test scenario 1", "Test scenario 2", "Test scenario 3"]` :
        guidelineText;
      
      // Call the LLM API to generate test cases
      const response = await callLLMAPI(llmPrompt);
      
      try {
        // Clean the response - remove any markdown formatting
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Parse the response as JSON array of strings
        const parsedTestCases = JSON.parse(cleanResponse);
        if (Array.isArray(parsedTestCases) && parsedTestCases.every(t => typeof t === 'string')) {
          setGeneratedTestCases(parsedTestCases);
          setShowTestCases(true);
          toast({
            title: "Test Cases Generated",
            description: `Generated ${parsedTestCases.length} test scenarios for remote agent testing.`,
            variant: "default",
          });
        } else {
          throw new Error("Invalid response format");
        }
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        console.error("Raw response was:", response);
        
        // Try one more time with basic cleanup
        try {
          let cleaned = response.trim();
          // Remove markdown
          if (cleaned.includes('```')) {
            const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              cleaned = jsonMatch[1].trim();
            }
          }
          
          // Fix common issues
          cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          
          const parsedTestCases = JSON.parse(cleaned);
          if (Array.isArray(parsedTestCases) && parsedTestCases.every(t => typeof t === 'string')) {
            setGeneratedTestCases(parsedTestCases);
            setShowTestCases(true);
            toast({
              title: "Test Cases Generated",
              description: `Generated ${parsedTestCases.length} test scenarios for remote agent testing.`,
              variant: "default",
            });
            return;
          }
        } catch (secondError) {
          console.error("Second parsing attempt also failed:", secondError);
        }
        
        // Fallback to predefined test cases if parsing fails
        const fallbackTestCases = generateContextualTestCases('remote-agent', testCases);
        setGeneratedTestCases(fallbackTestCases);
        setShowTestCases(true);
        toast({
          title: "Test Cases Generation Failed",
          description: `Couldn't generate test cases. Please start a new eval session.`,
          variant: "destructive",
        });
      }
      
      console.log("Generated test cases for remote agent:", generatedTestCases);
    } catch (error) {
      console.error("Error generating test cases:", error);
      toast({
        title: "Test Cases Generation Failed",
        description: "Couldn't generate test cases. Please start a new eval session.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  // Function to clean up guidelines by removing JSON formatting and backticks
  const cleanGuideline = (text: string): string => {
    if (!text) return "";
    
    // Remove JSON code blocks
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any remaining backticks
    cleaned = cleaned.replace(/```/g, '');
    
    // Remove common JSON artifacts
    cleaned = cleaned.replace(/^\s*[\{\[]\s*/, '').replace(/\s*[\}\]]\s*$/, '');
    
    // Remove quotes around the entire text if present
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Clean up any remaining formatting artifacts
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  const generateGuidelines = async () => {
    if (!isApiKeySet || !agentType.trim()) return;
    
    setIsGeneratingGuidelines(true);
    
    try {
      // Generate test case guideline
      const testCasePrompt = `You are an expert in GenAI Evals. Generate a comprehensive guideline for creating test cases for the following AI agent.

Agent Type: ${agentType}

Create a detailed guideline that includes:
1. What types of test scenarios are most important for this agent type
2. Key user interactions and edge cases to test
3. Specific considerations for this type of agent
4. How to structure test cases for maximum effectiveness

Return only the guideline text, no additional formatting or explanations.No need to give it in JSON format.Pure text only.`;

      // Generate scoring guideline
      const scoringPrompt = `You are an expert in GenAI Evals. Generate a comprehensive guideline for creating scoring metrics for the following AI agent.

Agent Type: ${agentType}

Create a detailed guideline that includes:
1. What performance aspects are most critical for this agent type
2. How to measure success for this type of agent
3. Specific evaluation criteria that are relevant to this agent type
4. How to structure rubrics for fair and accurate scoring

Return only the guideline text, no additional formatting or explanations.`;

      // Generate simulation guideline
      const simulationPrompt = `You are an expert in GenAI Evals. Generate a comprehensive guideline for creating realistic user simulations for the following AI agent.

Agent Type: ${agentType}

Create a detailed guideline that includes:
1. How to generate natural first messages from test case scenarios
2. What user personas and communication styles to simulate
3. How to create realistic conversation flows
4. Specific considerations for this type of agent and user expectations

Return only the guideline text, no additional formatting or explanations.`;

      // Generate all three guidelines in parallel
      const [testCaseResponse, scoringResponse, simulationResponse] = await Promise.all([
        callLLMAPI(testCasePrompt),
        callLLMAPI(scoringPrompt),
        callLLMAPI(simulationPrompt)
      ]);

      setGuidelines({
        testCaseGuideline: cleanGuideline(testCaseResponse),
        scoringGuideline: cleanGuideline(scoringResponse),
        simulationGuideline: cleanGuideline(simulationResponse)
      });

      toast({
        title: "Guidelines Generated",
        description: "Successfully generated guidelines for test case generation, scoring metrics, and simulation creation.",
        variant: "default",
      });

    } catch (error) {
      console.error("Error generating guidelines:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate guidelines. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGuidelines(false);
    }
  };

  // Functions to handle guideline editing
  const startEditingGuideline = (guidelineType: string) => {
    setEditingGuideline(guidelineType);
    setEditingGuidelineValue(guidelines[guidelineType as keyof typeof guidelines] || "");
  };

  const saveGuideline = () => {
    if (editingGuideline) {
      setGuidelines(prev => ({
        ...prev,
        [editingGuideline]: editingGuidelineValue
      }));
      setEditingGuideline(null);
      setEditingGuidelineValue("");
      
      toast({
        title: "Guideline Updated",
        description: "Guideline has been successfully updated.",
        variant: "default",
      });
    }
  };

  const cancelEditingGuideline = () => {
    setEditingGuideline(null);
    setEditingGuidelineValue("");
  };

  const generateContextualTestCases = (type: string, count: number): string[] => {
    const testCaseTemplates = {
      "customer-support": [
        "User reports login issues and needs immediate access to their account",
        "Customer complains about slow response time from support team",
        "User needs help with password reset and account recovery",
        "Customer reports a bug in the mobile application",
        "User requests refund for a service they didn't receive",
        "Customer needs technical support for software installation",
        "User reports unauthorized charges on their account",
        "Customer needs help with account settings and preferences"
      ],
      "food-delivery": [
        "User reports order not delivered within promised timeframe",
        "Customer receives wrong food items in their order",
        "User complains about cold food upon delivery",
        "Customer needs to cancel order due to emergency",
        "User reports missing items from their food order",
        "Customer needs help tracking their delivery status",
        "User wants to modify order before it's prepared",
        "Customer reports rude behavior from delivery person"
      ],
      "ecommerce": [
        "User can't find specific product in search results",
        "Customer needs help with payment method selection",
        "User wants to return item but return policy is unclear",
        "Customer reports website loading slowly during checkout",
        "User needs help with size selection for clothing items",
        "Customer wants to apply discount code but it's not working",
        "User reports item arrived damaged in shipping",
        "Customer needs help with account creation and verification"
      ],
      "banking": [
        "User reports suspicious transaction on their account",
        "Customer needs help with online banking setup",
        "User wants to transfer money but transfer is failing",
        "Customer needs help with loan application process",
        "User reports ATM card not working at multiple locations",
        "Customer needs help with investment account information",
        "User wants to update personal information on account",
        "Customer needs help with mobile banking app issues"
      ],
      "healthcare": [
        "User needs help scheduling urgent care appointment",
        "Patient wants to reschedule existing appointment",
        "User needs information about insurance coverage",
        "Patient reports medication side effects",
        "User needs help with online patient portal access",
        "Patient wants to request medical records",
        "User needs information about available services",
        "Patient reports billing issues with recent visit"
      ],
      "travel": [
        "User needs help changing flight booking due to emergency",
        "Customer reports hotel room not as advertised",
        "User needs help with car rental reservation",
        "Customer wants to cancel trip due to weather concerns",
        "User reports lost luggage during international travel",
        "Customer needs help with visa application process",
        "User wants to modify travel itinerary",
        "Customer reports poor service at booked restaurant"
      ],
      "education": [
        "Student needs help accessing online course materials",
        "User wants to enroll in additional courses",
        "Student reports technical issues with learning platform",
        "User needs help with assignment submission",
        "Student wants to request extension for deadline",
        "User needs information about course prerequisites",
        "Student reports problems with online exam system",
        "User wants to access tutoring services"
      ],
      "custom": [
        "User needs help with basic functionality",
        "Customer reports system error during operation",
        "User wants to customize settings and preferences",
        "Customer needs help with account management",
        "User reports slow performance issues",
        "Customer wants to access advanced features",
        "User needs help with integration setup",
        "Customer reports accessibility issues"
      ]
    };
    
    const templates = testCaseTemplates[type as keyof typeof testCaseTemplates] || testCaseTemplates.custom;
    // Return random selection of test cases up to the requested count
    return templates.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  // CSV Upload Functions
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          toast({
            title: "Empty CSV",
            description: "The CSV file appears to be empty.",
            variant: "destructive",
          });
          return;
        }

        const testCases: string[] = [];
        lines.forEach((line, index) => {
          if (index === 0 && (line.toLowerCase().includes('test') || line.toLowerCase().includes('scenario') || line.toLowerCase().includes('description'))) {
            return;
          }
          
          const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
          if (columns[0] && columns[0].trim()) {
            testCases.push(columns[0].trim());
          }
        });

        if (testCases.length === 0) {
          toast({
            title: "No Test Cases Found",
            description: "No valid test cases found in the CSV file. Please ensure the first column contains test scenario descriptions.",
            variant: "destructive",
          });
          return;
        }

        setUploadedTestCases(testCases);
        setCsvFileName(file.name);
        setUseUploadedTestCases(false);
        
        toast({
          title: "CSV Uploaded Successfully",
          description: `Found ${testCases.length} test cases in ${file.name}`,
          variant: "default",
        });

      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "CSV Parse Error",
          description: "Failed to parse the CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const generateTestCasesFromUploaded = async () => {
    if (!isApiKeySet || uploadedTestCases.length === 0) return;
    
    setIsGeneratingFromUploaded(true);
    
    try {
      const fewShotExamples = uploadedTestCases
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(5, uploadedTestCases.length));
      
       const llmPrompt = `You are an expert in chatbot testing. Generate ${testCases} additional realistic test scenarios for testing a remote chatbot agent.

Number of Test Cases to Generate: ${testCases}

Here are some example test cases from the user's dataset to guide your generation:
${fewShotExamples.map((example, index) => `${index + 1}. ${example}`).join('\n')}

Requirements:
- Generate exactly ${testCases} NEW test scenarios (different from the examples above)
- Make scenarios realistic and relevant to general chatbot functionality
- Follow the style and complexity level of the provided examples
- Include both common use cases and edge cases
- Focus on user interactions that would test the chatbot's capabilities
- Return only a JSON array of strings, no additional text

Example format: ["Test scenario 1", "Test scenario 2", "Test scenario 3"]

Generate test scenarios that complement the user's existing test cases and would thoroughly evaluate any chatbot's performance.`;
      
      const response = await callLLMAPI(llmPrompt);
      
      try {
        const parsedTestCases = JSON.parse(response);
        if (Array.isArray(parsedTestCases) && parsedTestCases.every(t => typeof t === 'string')) {
          const combinedTestCases = [...uploadedTestCases, ...parsedTestCases];
          setGeneratedTestCases(combinedTestCases);
          setShowTestCases(true);
          setUseUploadedTestCases(true);
          
          toast({
            title: "Test Cases Generated",
            description: `Generated ${parsedTestCases.length} additional test cases based on your uploaded examples. Total: ${combinedTestCases.length} test cases.`,
            variant: "default",
          });
        } else {
          throw new Error("Invalid response format");
        }
      } catch (parseError) {
        setGeneratedTestCases(uploadedTestCases);
        setShowTestCases(true);
        setUseUploadedTestCases(true);
        
        toast({
          title: "Using Uploaded Test Cases",
          description: `Using ${uploadedTestCases.length} test cases from your CSV file.`,
          variant: "default",
        });
      }
      
    } catch (error) {
      setGeneratedTestCases(uploadedTestCases);
      setShowTestCases(true);
      setUseUploadedTestCases(true);
      
      toast({
        title: "Using Uploaded Test Cases",
        description: `Using ${uploadedTestCases.length} test cases from your CSV file.`,
        variant: "default",
      });
    } finally {
      setIsGeneratingFromUploaded(false);
    }
  };

  const useUploadedTestCasesOnly = () => {
    setGeneratedTestCases(uploadedTestCases);
    setShowTestCases(true);
    setUseUploadedTestCases(true);
    
    toast({
      title: "Using Uploaded Test Cases",
      description: `Using ${uploadedTestCases.length} test cases from your CSV file.`,
      variant: "default",
    });
  };

  const clearUploadedTestCases = () => {
    setUploadedTestCases([]);
    setCsvFileName("");
    setUseUploadedTestCases(false);
    setShowUploadedTestCases(false);
    
    toast({
      title: "Uploaded Test Cases Cleared",
      description: "Uploaded test cases have been cleared.",
      variant: "default",
    });
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      "Test Scenario Description",
      "User reports login issues and needs immediate access to their account",
      "Customer complains about slow response time from support team",
      "User needs help with password reset and account recovery",
      "Customer reports a bug in the mobile application",
      "User requests refund for a service they didn't receive"
    ];
    
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_test_cases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const addCustomTestCase = () => {
    if (customTestCase.trim() && !generatedTestCases.includes(customTestCase.trim())) {
      setGeneratedTestCases([...generatedTestCases, customTestCase.trim()]);
      setCustomTestCase("");
    }
  };

  const removeTestCase = (index: number) => {
    setGeneratedTestCases(generatedTestCases.filter((_, i) => i !== index));
  };

  const addCustomMetric = () => {
    if (newMetric.trim() && !customMetrics.includes(newMetric.trim())) {
      setCustomMetrics([...customMetrics, newMetric.trim()]);
      setNewMetric("");
    }
  };

  const removeMetric = (index: number) => {
    setCustomMetrics(customMetrics.filter((_, i) => i !== index));
  };

  const handleStartTest = () => {
    const config = {
      chatbotType: 'remote-agent',
      systemPrompt: 'Remote agent endpoint',
      testCases: testCases,
      conversationMode,
      conversationRange,
      conversationTurns: conversationTurns[0],
      customMetrics,
      scoringMetrics,
      generatedTestCases,
      uploadedTestCases,
      csvFileName,
      useUploadedTestCases,
      chatbotMode: 'endpoint' as const,
      endpointUrl,
      isEndpointValid: !!endpointUrl,
      agentType,
      guidelines,
      // Add extracted token and cookies for remote agent authentication
      authorizationToken: extractedToken || undefined,
      extractedHeaders,
      extractedCookies,
      // Add RAG evaluation configuration
      evaluationMode,
      uploadedDocuments: uploadedDocuments.map(doc => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        chunkCount: doc.chunkCount
      })),
      timestamp: new Date()
    };
    
    // Save configuration before starting test
    saveConfiguration();
    
    onStartTest(config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Test Configuration</h2>
          <p className="text-muted-foreground">Set up your chatbot testing parameters</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button 
            onClick={handleStartTest} 
            className="btn-hero gap-2"
            disabled={
              generatedTestCases.length === 0 ||
              !isApiKeySet ||
              !isEndpointSet ||
              scoringMetrics.length === 0
            }
          >
            <Play className="h-4 w-4" />
            Start Testing
          </Button>
          {isApiKeySet && generatedTestCases.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Generate test cases to start testing
            </p>
          )}
          {isApiKeySet && generatedTestCases.length > 0 && scoringMetrics.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Generate scoring metrics to start testing
            </p>
          )}
          {!isApiKeySet && (
            <p className="text-xs text-muted-foreground">
              Set API key to generate test cases and metrics
            </p>
          )}
          {!isEndpointSet && (
            <p className="text-xs text-muted-foreground">
              Extract endpoint URL from curl command to configure remote agent
            </p>
          )}
          <div className="text-xs text-muted-foreground">
            <p>Debug: isApiKeySet={isApiKeySet.toString()}, isEndpointSet={isEndpointSet.toString()}, scoringMetrics={scoringMetrics.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* API Configuration - Added before chatbot type selection */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Gemini API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Gemini API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your Gemini API key..."
                    value={localApiKeyInput}
                    onChange={handleApiKeyInputChange}
                    className="flex-1"
                  />
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleSetApiKey}
                    disabled={!localApiKeyInput.trim()}
                  >
                    {isApiKeySet ? "Update API Key" : "Set API Key"}
                  </Button>
                  {isApiKeySet && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setApiKey("");
                        setLocalApiKeyInput("");
                        toast({
                          title: "API Key Cleared",
                          description: "Your API key has been cleared.",
                          variant: "destructive",
                        });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Required to connect to Gemini AI for generating scoring metrics and test cases. Set your API key before configuring other options.
                </p>
                {isApiKeySet && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      ✓ API Key Set
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Key: {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent Type Configuration */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Agent Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Textarea
                    id="agent-type"
                    placeholder="Describe the type of AI agent being evaluated (e.g., Customer Support Bot, Sales Assistant, Technical Support Agent, etc.)"
                    value={agentType}
                    onChange={(e) => setAgentType(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a detailed description of what type of AI agent you're evaluating
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={generateGuidelines}
                    disabled={!isApiKeySet || !agentType.trim() || isGeneratingGuidelines}
                    className="gap-2 flex-1"
                  >
                    {isGeneratingGuidelines ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Generating Guidelines...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Generate Guidelines
                      </>
                    )}
                  </Button>
                </div>

                {guidelines.testCaseGuideline && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    {/* Test Case Generation Guideline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Test Case Generation Guideline
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingGuideline('testCaseGuideline')}
                          className="gap-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                      {editingGuideline === 'testCaseGuideline' ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingGuidelineValue}
                            onChange={(e) => setEditingGuidelineValue(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Enter test case generation guideline..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveGuideline}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingGuideline}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.testCaseGuideline}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Scoring Metrics Guideline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Scoring Metrics Guideline
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingGuideline('scoringGuideline')}
                          className="gap-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                      {editingGuideline === 'scoringGuideline' ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingGuidelineValue}
                            onChange={(e) => setEditingGuidelineValue(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Enter scoring metrics guideline..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveGuideline}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingGuideline}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.scoringGuideline}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Simulation Generation Guideline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Simulation Generation Guideline
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingGuideline('simulationGuideline')}
                          className="gap-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                      {editingGuideline === 'simulationGuideline' ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingGuidelineValue}
                            onChange={(e) => setEditingGuidelineValue(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Enter simulation generation guideline..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveGuideline}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingGuideline}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.simulationGuideline}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isApiKeySet && (
                  <p className="text-sm text-muted-foreground">
                    Please set your API key first to generate guidelines
                  </p>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Evaluation Mode Selection */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Evaluation Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Select Evaluation Type</Label>
                <Select value={evaluationMode} onValueChange={(value: any) => setEvaluationMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-rag">Standard Evaluation (No RAG)</SelectItem>
                    <SelectItem value="rag">RAG Evaluation Only</SelectItem>
                    <SelectItem value="both">Both (Standard + RAG)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {evaluationMode === 'non-rag' && 'Standard conversation evaluation without document context'}
                  {evaluationMode === 'rag' && 'Evaluate agent responses based on uploaded documents (RAG)'}
                  {evaluationMode === 'both' && 'Evaluate both standard conversation quality and RAG performance'}
                </p>
              </div>

              {/* Document Upload for RAG */}
              {(evaluationMode === 'rag' || evaluationMode === 'both') && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Upload Documents (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        setIsUploadingDocument(true);
                        try {
                          const uploadPromises = Array.from(files).map(async (file) => {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('sessionId', currentSession?.id || '');

                            const response = await fetch('/api/documents/upload', {
                              method: 'POST',
                              headers: {
                                'x-user-id': localStorage.getItem('user-id') || 'unknown'
                              },
                              body: formData
                            });

                            const result = await response.json();
                            if (result.success) {
                              // Process the document
                              const processResponse = await fetch('/api/documents/process', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-user-id': localStorage.getItem('user-id') || 'unknown'
                                },
                                body: JSON.stringify({ documentId: result.data.documentId })
                              });

                              const processResult = await processResponse.json();
                              if (processResult.success) {
                                return {
                                  ...result.data,
                                  ...processResult.data
                                };
                              }
                            }
                            return null;
                          });

                          const uploadedDocs = (await Promise.all(uploadPromises)).filter(doc => doc !== null);
                          setUploadedDocuments(prev => [...prev, ...uploadedDocs]);
                          
                          toast({
                            title: 'Documents uploaded',
                            description: `Successfully uploaded ${uploadedDocs.length} document(s)`
                          });
                        } catch (error) {
                          console.error('Error uploading documents:', error);
                          toast({
                            title: 'Upload failed',
                            description: 'Failed to upload documents. Please try again.',
                            variant: 'destructive'
                          });
                        } finally {
                          setIsUploadingDocument(false);
                        }
                      }}
                      disabled={isUploadingDocument}
                    />
                  </div>

                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Uploaded Documents ({uploadedDocuments.length})</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-lg bg-muted/20">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium">{doc.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.chunkCount} chunks • {(doc.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isUploadingDocument && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Uploading and processing documents...</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Curl Token Extractor */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Remote Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurlTokenExtractor
                onTokenExtracted={handleTokenExtracted}
                onUrlExtracted={handleUrlExtracted}
              />
              {isTokenExtracted && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Token, headers, and endpoint URL extracted successfully!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    The extracted token and endpoint URL will be used for authentication and communication with the remote agent.
                  </p>
                </div>
              )}
              <div className="mt-4 text-xs text-muted-foreground">
                <p>• The endpoint should accept POST requests with JSON payload</p>
                <p>• Expected format: {"{message: string, ...}"}</p>
                <p>• Should return streaming responses or JSON</p>
              </div>
            </CardContent>
          </Card>

          {/* Test Parameters */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Test Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                   <Label className="flex items-center gap-2">
                     <Users className="h-4 w-4" />
                     Number of Test Cases
                   </Label>
                   <Input
                     type="number"
                     min="1"
                     max="1000"
                     value={testCases}
                     onChange={(e) => setTestCases(parseInt(e.target.value) || 1)}
                     className="w-full"
                     disabled={!isApiKeySet}
                     placeholder="Enter number of test cases (1-1000)"
                   />
                   <p className="text-xs text-muted-foreground">
                     Enter a number between 1 and 1000
                   </p>
                 </div>

                 <div className="space-y-3">
                   <Label className="flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     Conversation Mode
                   </Label>
                   <Select
                     value={conversationMode}
                     onValueChange={(value: 'fixed' | 'range' | 'auto') => setConversationMode(value)}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="fixed">Fixed Number</SelectItem>
                       <SelectItem value="range">Range</SelectItem>
                       <SelectItem value="auto">Auto (AI Decides)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               {/* Conversation Configuration based on mode */}
               {conversationMode === 'fixed' && (
                 <div className="space-y-3">
                   <Label className="flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     Conversation Turns: {conversationTurns[0]}
                   </Label>
                   <Slider
                     value={conversationTurns}
                     onValueChange={setConversationTurns}
                     max={15}
                     min={1}
                     step={1}
                     className="w-full"
                   />
                   <div className="flex justify-between text-xs text-muted-foreground">
                     <span>1</span>
                     <span>15</span>
                   </div>
                 </div>
               )}

               {conversationMode === 'range' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-3">
                     <Label className="flex items-center gap-2">
                       <Clock className="h-4 w-4" />
                       Minimum Turns: {conversationRange.min}
                     </Label>
                     <Slider
                       value={[conversationRange.min]}
                       onValueChange={(value) => setConversationRange(prev => ({ ...prev, min: value[0] }))}
                       max={10}
                       min={1}
                       step={1}
                       className="w-full"
                     />
                     <div className="flex justify-between text-xs text-muted-foreground">
                       <span>1</span>
                       <span>10</span>
                     </div>
                   </div>
                   <div className="space-y-3">
                     <Label className="flex items-center gap-2">
                       <Clock className="h-4 w-4" />
                       Maximum Turns: {conversationRange.max}
                     </Label>
                     <Slider
                       value={[conversationRange.max]}
                       onValueChange={(value) => setConversationRange(prev => ({ ...prev, max: value[0] }))}
                       max={15}
                       min={conversationRange.min}
                       step={1}
                       className="w-full"
                     />
                     <div className="flex justify-between text-xs text-muted-foreground">
                       <span>{conversationRange.min}</span>
                       <span>15</span>
                     </div>
                   </div>
                 </div>
               )}

               {conversationMode === 'auto' && (
                 <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                   <Label className="flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     Auto Conversation Mode
                   </Label>
                   <p className="text-sm text-muted-foreground">
                     The AI will automatically determine when to end each conversation based on:
                   </p>
                   <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                     <li>• Issue resolution or satisfactory answer</li>
                     <li>• Conversation reaching a natural conclusion</li>
                     <li>• Low stopping threshold to prevent endless loops</li>
                     <li>• Maximum safety limit of 10 turns per conversation</li>
                   </ul>
                 </div>
               )}
              
              {/* Test Case Generation */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Test Case Generation</Label>
                  <Button
                    onClick={() => {
                      console.log('Generate Test Cases clicked. isApiKeySet:', isApiKeySet);
                      generateTestCases();
                    }}
                    disabled={!isApiKeySet || isGeneratingTestCases}
                    className="gap-2"
                  >
                    {isGeneratingTestCases ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Generate Test Cases
                      </>
                    )}
                  </Button>
                </div>
                
                {generatedTestCases.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Generated Test Cases ({generatedTestCases.length})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTestCases(!showTestCases)}
                      >
                        {showTestCases ? "Hide" : "Show"} Test Cases
                      </Button>
                    </div>
                    
                    {showTestCases && (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {generatedTestCases.map((testCase, index) => (
                          <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                            <span className="text-sm flex-1 mr-3">{testCase}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/20 flex-shrink-0"
                              onClick={() => removeTestCase(index)}
                              disabled={!isApiKeySet}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Custom Test Case Input */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Add Custom Test Case</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe a specific test scenario..."
                      value={customTestCase}
                      onChange={(e) => setCustomTestCase(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomTestCase()}
                      disabled={!apiKey.trim()}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addCustomTestCase}
                      disabled={!isApiKeySet || !customTestCase.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add specific test scenarios that the LLM should generate
                  </p>
                </div>

                {/* CSV Upload Section */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Test Cases from CSV
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCsv}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Sample CSV
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        disabled={!isApiKeySet}
                        className="flex-1"
                      />
                    </div>
                    
                    {csvFileName && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{csvFileName}</span>
                          <Badge variant="secondary">{uploadedTestCases.length} test cases</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearUploadedTestCases}
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {uploadedTestCases.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            onClick={useUploadedTestCasesOnly}
                            disabled={!isApiKeySet}
                            variant="outline"
                            className="gap-2 flex-1"
                          >
                            <FileText className="h-4 w-4" />
                            Use Uploaded Test Cases Only
                          </Button>
                          <Button
                            onClick={generateTestCasesFromUploaded}
                            disabled={!isApiKeySet || isGeneratingFromUploaded}
                            className="gap-2 flex-1"
                          >
                            {isGeneratingFromUploaded ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Generate More from Uploaded
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {showUploadedTestCases && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadedTestCases.map((testCase, index) => (
                              <div key={index} className="p-2 rounded bg-muted/10 border border-border/20">
                                <span className="text-xs">{testCase}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUploadedTestCases(!showUploadedTestCases)}
                          className="w-full"
                        >
                          {showUploadedTestCases ? "Hide" : "Show"} Uploaded Test Cases
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Upload a CSV file with test scenario descriptions in the first column. 
                      You can either use them directly or generate additional test cases using 4-5 of your uploaded cases as examples.
                    </p>
                  </div>
                </div>
              </div>
              
              {!isApiKeySet && (
                <p className="text-sm text-muted-foreground">
                  Please set your API key first to configure test parameters
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scoring Metrics */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Scoring Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generate Scoring Metrics Button */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('Generate Scoring Metrics clicked. isApiKeySet:', isApiKeySet);
                    generateScoringMetrics();
                  }}
                  disabled={!isApiKeySet || isGeneratingScoringMetrics}
                  className="gap-2 flex-1"
                >
                  {isGeneratingScoringMetrics ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Scoring Metrics
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScoringMetrics(!showScoringMetrics)}
                  disabled={scoringMetrics.length === 0}
                >
                  {showScoringMetrics ? "Hide" : "Show"} Rubrics
                </Button>
              </div>

              {/* Scoring Metrics List */}
              <div className="space-y-3">
                {scoringMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{metric.name}</span>
                          <Badge variant="outline" className="text-xs">0.0-{metric.totalPoints}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/20"
                        onClick={() => removeScoringMetric(index)}
                        disabled={!isApiKeySet}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Rubrics Display */}
                    {showScoringMetrics && (
                      <div className="ml-4 space-y-2">
                        {metric.rubrics.map((rubric, rubricIndex) => (
                          <div key={rubricIndex} className="flex items-start gap-3 p-2 rounded-md bg-muted/10 border border-border/20">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                              <span className="text-xs font-medium text-muted-foreground min-w-0">
                                {rubric.criterion}
                              </span>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {rubric.points} pts
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex-1">
                              {rubric.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Custom Metric Input */}
              <div className="space-y-3 pt-4 border-t border-border/30">
                <Label className="text-sm font-medium">Add Custom Scoring Metric</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter metric name (e.g., 'Response Time')..."
                    value={newCustomMetricName}
                    onChange={(e) => setNewCustomMetricName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && generateCustomScoringMetric()}
                    disabled={!isApiKeySet}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateCustomScoringMetric} 
                    disabled={!isApiKeySet || !newCustomMetricName.trim() || isGeneratingCustomMetric}
                  >
                    {isGeneratingCustomMetric ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  LLM will generate detailed rubrics for your custom metric
                </p>
              </div>

              {!isApiKeySet && (
                <p className="text-sm text-muted-foreground">
                  Please set your API key first to configure scoring metrics
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test Preview */}
          <Card className="metric-card">
            <CardHeader>
              <CardTitle className="text-lg">Test Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isApiKeySet ? (
                <div className="text-center py-4">
                  <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Set your API key to see test preview</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span>Remote Agent</span>
                  </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Test Cases:</span>
                     <span>{testCases}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Generated:</span>
                     <span className={generatedTestCases.length > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                       {generatedTestCases.length > 0 ? `${generatedTestCases.length} ready` : "Not generated"}
                     </span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Conversation Mode:</span>
                     <span className="capitalize">{conversationMode}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Turns:</span>
                     <span>
                       {conversationMode === 'fixed' && conversationTurns[0]}
                       {conversationMode === 'range' && `${conversationRange.min}-${conversationRange.max}`}
                       {conversationMode === 'auto' && 'Auto (AI decides)'}
                     </span>
                   </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scoring Metrics:</span>
                    <span>{scoringMetrics.length}</span>
                  </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Est. Duration:</span>
                     <span>
                       {conversationMode === 'fixed' && `${Math.ceil(testCases * conversationTurns[0] * 0.5)} min`}
                       {conversationMode === 'range' && `${Math.ceil(testCases * conversationRange.min * 0.5)}-${Math.ceil(testCases * conversationRange.max * 0.5)} min`}
                       {conversationMode === 'auto' && `${Math.ceil(testCases * 3 * 0.5)}-${Math.ceil(testCases * 6 * 0.5)} min`}
                     </span>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestConfiguration;