import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, User, Bot, Play, CheckCircle, Gavel, Globe, X } from "lucide-react";
import { useDataPersistence } from "@/contexts/DataPersistenceContext";
import { useToast } from "@/hooks/use-toast";
import { getDeterministicConversationTurns } from "../lib/deterministicUtils";

interface ConversationSimulatorProps {
  testCases: string[];
  systemPrompt: string;
  chatbotType: string;
  conversationTurns: number; // -1 indicates auto mode
  conversationMode?: 'fixed' | 'range' | 'auto';
  conversationRange?: { min: number; max: number };
  endpointUrl: string;
  endpointApiKey?: string;
  guidelines?: {
    testCaseGuideline: string;
    scoringGuideline: string;
    simulationGuideline: string;
  };
  agentType?: string;
  apiKey?: string;
  useCorsProxy?: boolean; // Add CORS proxy option
  authorizationToken?: string; // Add extracted authorization token
  extractedHeaders?: Record<string, string>; // Add extracted headers
  extractedCookies?: Record<string, string>; // Add extracted cookies
  onConversationsComplete: (conversations: SimulatedConversation[]) => void;
  onRunEvaluation?: (conversations: SimulatedConversation[]) => void; // Updated to pass conversations
}

export interface SimulatedConversation {
  id: string;
  testCase: string;
  messages: ConversationMessage[];
  completed: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const ConversationSimulator = ({ 
  testCases, 
  systemPrompt, 
  chatbotType, 
  conversationTurns,
  conversationMode = 'fixed',
  conversationRange = { min: 2, max: 5 },
  endpointUrl,
  endpointApiKey,
  guidelines,
  agentType,
  apiKey,
  useCorsProxy = false,
  authorizationToken,
  extractedHeaders,
  extractedCookies,
  onConversationsComplete,
  onRunEvaluation
}: ConversationSimulatorProps) => {
  const { currentSession } = useDataPersistence();
  
  // Use endpointUrl from props, or fallback to session config
  const actualEndpointUrl = endpointUrl || currentSession?.testConfig?.endpointUrl || '';
  const { updateSimulatedConversations } = useDataPersistence();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<SimulatedConversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  // Initialize conversations from test cases or load from existing session
  useEffect(() => {
    if (currentSession && currentSession.simulatedConversations.length > 0) {
      // Load existing conversations from session
      setConversations(currentSession.simulatedConversations);
    } else if (testCases && testCases.length > 0) {
      // Initialize new conversations from test cases
      const initialConversations = testCases.map((testCase, index) => ({
        id: `conv-${index}`,
        testCase,
        messages: [],
        completed: false
      }));
      setConversations(initialConversations);
    }
  }, [testCases, currentSession]);

  const generateConversationStarterMessage = async (testCase: string, agentType: string, systemPrompt: string): Promise<string> => {
    if (!apiKey) {
      return testCase; // Fallback to test case if no API key
    }

    try {
      const prompt = `You are an expert in simulating realistic user conversations with AI agents. Your task is to generate a natural first message that a real user would say to start a conversation based on a test scenario.

TEST SCENARIO: ${testCase}
AGENT TYPE: ${agentType}
SYSTEM CONTEXT: ${systemPrompt}

GUIDELINES:
- Generate a natural, conversational first message that a real user would actually say
- Make it sound like a real person starting a conversation, not a test case description
- Include relevant context and details that a real user would mention
- Use natural language and conversational tone
- Don't mention that this is a test or evaluation
- Make it specific to the scenario but conversational
- Keep it concise but informative enough to start a meaningful conversation

${guidelines?.simulationGuideline ? `ADDITIONAL GUIDELINES: ${guidelines.simulationGuideline}` : ''}

Generate only the user's first message, no additional text or explanations.

User's first message:`;

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
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid Gemini API response format');
      }

      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Failed to generate conversation starter message:', error);
      return testCase; // Fallback to test case if LLM fails
    }
  };

  const generateContextualUserMessage = async (conversationHistory: ConversationMessage[], originalTestCase: string): Promise<string> => {
    if (!apiKey) {
      return "Can you tell me more about that?";
    }

    try {
      const conversationText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `You are simulating a user in a conversation with an AI assistant. Based on the conversation history and the original test case, generate a natural follow-up question or response that a real user would say.

ORIGINAL TEST CASE: ${originalTestCase}

CONVERSATION HISTORY:
${conversationText}

GUIDELINES:
- Generate a natural, conversational response that a real user would say
- Make it relevant to the current conversation context
- Ask follow-up questions, request clarification, or express interest
- Keep it concise and realistic
- Don't repeat previous questions

Generate only the user's next message, no additional text or explanations.

User's next message:`;

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
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid Gemini API response format');
      }

      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Failed to generate contextual user message:', error);
      return "Can you tell me more about that?";
    }
  };

  const shouldEndConversation = async (conversationHistory: ConversationMessage[], originalTestCase: string): Promise<boolean> => {
    if (!apiKey) {
      // If no API key, use a simple heuristic based on conversation length
      return conversationHistory.length >= 6; // 3 exchanges (user-assistant-user-assistant-user-assistant)
    }

    try {
      const conversationText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `You are evaluating whether a conversation between a user and an AI assistant should end. 

ORIGINAL TEST CASE: ${originalTestCase}

CONVERSATION HISTORY:
${conversationText}

EVALUATION CRITERIA:
- Has the user's original issue been adequately addressed or resolved?
- Has the conversation reached a natural conclusion?
- Is the user satisfied with the response (even if the issue isn't fully solved)?
- Are we going in circles or repeating the same information?
- Has the conversation become unproductive or off-topic?

IMPORTANT: Use a LOW threshold for ending conversations. It's better to end slightly early than to let conversations drag on unnecessarily.

Respond with only "YES" if the conversation should end, or "NO" if it should continue.`;

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
            temperature: 0.3,
            maxOutputTokens: 10,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid Gemini API response format');
      }

      const decision = data.candidates[0].content.parts[0].text.trim().toUpperCase();
      return decision === 'YES';
    } catch (error) {
      console.error('Failed to evaluate conversation end:', error);
      // Fallback: end conversation if it's getting long (safety mechanism)
      return conversationHistory.length >= 8; // 4 exchanges
    }
  };

  const testConnection = async (): Promise<boolean> => {
    setConnectionStatus('testing');
    setConnectionError(null);
    
    try {
      console.log('=== TESTING CONNECTION ===');
      const result = await sendMessageToRemoteAgent("hi");
      console.log('Connection test successful:', result);
      setConnectionStatus('success');
      setConnectionError(null);
      toast({
        title: "Connection Successful",
        description: `Successfully connected to remote agent${result.metadata?.chatThreadId ? ` (Thread: ${result.metadata.chatThreadId})` : ''}.`,
        variant: "default",
      });
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: "Connection Failed",
        description: `Failed to connect to remote agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const sendMessageToRemoteAgent = async (message: string, conversationHistory: ConversationMessage[] = [], threadId?: string): Promise<{ message: string; metadata?: any }> => {
    const finalEndpointUrl = useCorsProxy 
      ? `https://cors-anywhere.herokuapp.com/${actualEndpointUrl}`
      : actualEndpointUrl;
    
    // Append thread_id as query parameter if we have one
    const finalUrl = threadId 
      ? `${finalEndpointUrl}?thread_id=${threadId}`
      : finalEndpointUrl;

    // Use extracted headers or fallback to default headers
    const defaultHeaders: Record<string, string> = {
      'accept': '*/*, text/event-stream',
      'accept-language': 'en-US,en;q=0.9,te;q=0.8,bn;q=0.7',
      'content-type': 'application/json',
      'origin': 'https://chetantalele.graphy.com',
      'referer': 'https://chetantalele.graphy.com/talk/unspecified',
      'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    };

    // Use extracted authorization token or fallback to default
    if (authorizationToken) {
      defaultHeaders['authorization'] = authorizationToken;
    } else {
      defaultHeaders['authorization'] = 'Basic NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmI5OjY4YjlkMzUxOWEzZTI1NjVjZGExOWZiYT1iZDRiYmFmY2YzNTNmN2ZiMDM1NzUyNTBhZDI0NzRkOQ==';
    }

    // Use extracted cookies or fallback to default
    if (extractedCookies && Object.keys(extractedCookies).length > 0) {
      const cookieString = Object.entries(extractedCookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      defaultHeaders['cookie'] = cookieString;
    } else {
      defaultHeaders['cookie'] = 'id=6b697ab2-7e66-4ca6-b461-1693b3c3e987; c_login_token=1757071676300; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=en; SESSIONID=C0C46F67FC5FDA82337F372687C40FCE; amp_e56929=iXJPVyYBBY61NWrtk7ozhl...1j6epslhj.1j6epsqeo.0.0.0; amp_e56929_graphy.com=iXJPVyYBBY61NWrtk7ozhl.NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmJh..1j6epslke.1j6epsqlk.k.f.13';
    }

    // Merge with any additional extracted headers, but avoid duplicates
    const headers = {
      ...defaultHeaders,
      ...extractedHeaders
    };

    // Clean up headers to avoid conflicts and duplicates
    const cleanHeaders: Record<string, string> = {};
    
    // Define the exact headers we want to send (matching the working curl command)
    const requiredHeaders: Record<string, string> = {
      'accept': '*/*, text/event-stream',
      'accept-language': 'en-US,en;q=0.9,te;q=0.8,bn;q=0.7',
      'authorization': headers['authorization'] || defaultHeaders['authorization'],
      'content-type': 'application/json',
      'origin': 'https://chetantalele.graphy.com',
      'referer': 'https://chetantalele.graphy.com/talk/unspecified',
      'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    };

    // Add cookies if available
    if (headers['cookie']) {
      requiredHeaders['cookie'] = headers['cookie'];
    }

    // Use the cleaned headers
    Object.assign(cleanHeaders, requiredHeaders);

    // Request body matching your working curl command exactly
    const requestBody = {
      "message": message,
      "avatar": {
        "id": "68b9d37fafa0498cc96f4f9f",
        "name": "Chetan  Talele"
      },
      "send_as": "learner",
      "metadata": {
        "assets": [],
        "conversation_history": conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }))
      },
      "channel": "web",
      "modality": "text"
    };

    // Debug logging
    console.log('=== REMOTE AGENT REQUEST DEBUG ===');
    console.log('Final URL:', finalUrl);
    console.log('Clean Headers:', cleanHeaders);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Authorization Token:', authorizationToken ? 'Present' : 'Using default');
    console.log('Extracted Headers:', extractedHeaders);
    console.log('Extracted Cookies:', extractedCookies);

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: cleanHeaders,
      body: JSON.stringify(requestBody)
    });

    console.log('=== REMOTE AGENT RESPONSE DEBUG ===');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== REMOTE AGENT ERROR ===');
      console.error('Error Status:', response.status);
      console.error('Error Status Text:', response.statusText);
      console.error('Error Response Body:', errorText);
      console.error('Request URL:', finalUrl);
      console.error('Request Headers:', cleanHeaders);
      console.error('Request Body:', JSON.stringify(requestBody, null, 2));
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // Handle streaming response
    if (!response.body) {
      throw new Error('No response body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalMessage = '';
    let metadata: any = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // Remove 'data: ' prefix
              const data = JSON.parse(jsonStr);
              
              // Accumulate message content from streaming chunks
              if (data.message && !data.is_final && !data.isFinal) {
                finalMessage += data.message;
              }
              
              // Store final response data
              if (data.is_final || data.isFinal) {
                finalMessage = data.message || finalMessage;
                metadata = {
                  id: data.id,
                  chatThreadId: data.chat_thread_id || data.chatThreadId,
                  timestamp: data.timestamp,
                  thread: data.thread
                };
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
              console.error('Line that failed:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      message: finalMessage || 'No response received',
      metadata
    };
  };

  const simulateConversation = async (conversation: SimulatedConversation) => {
    setIsProcessing(true);
    const updatedConversation = { ...conversation };
    let currentThreadId: string | undefined = undefined;
    
    try {
      // Test connection first if not already tested
      if (!connectionTested) {
        try {
          const testResponse = await sendMessageToRemoteAgent("hi");
          if (testResponse.metadata?.chatThreadId) {
            currentThreadId = testResponse.metadata.chatThreadId;
          }
          setConnectionTested(true);
        } catch (error) {
          throw new Error("Failed to connect to remote agent");
        }
      }

      // Generate first user message using conversation starter LLM
      let firstUserContent = conversation.testCase; // Fallback to test case
      
      if (apiKey) {
        try {
          firstUserContent = await generateConversationStarterMessage(
            conversation.testCase, 
            agentType || 'AI Agent', 
            systemPrompt || 'Remote agent endpoint'
          );
        } catch (error) {
          console.error('Failed to generate conversation starter message:', error);
          // Keep fallback to test case
        }
      }

      const firstUserMessage: ConversationMessage = {
        role: 'user',
        content: firstUserContent,
        timestamp: new Date()
      };
      updatedConversation.messages.push(firstUserMessage);
      
      // Update conversation in state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id ? { ...updatedConversation } : conv
        )
      );

      // Determine conversation parameters based on mode
      let maxTurns: number;
      let useAutoEnding = false;

      if (conversationMode === 'fixed') {
        maxTurns = conversationTurns;
      } else if (conversationMode === 'range') {
        // Use deterministic selection based on conversation ID for reproducibility
        maxTurns = getDeterministicConversationTurns(
          conversation.id, 
          conversationRange.min, 
          conversationRange.max
        );
      } else { // auto mode
        maxTurns = 10; // Safety limit
        useAutoEnding = true;
      }

      // Simulate conversation turns
      for (let turn = 0; turn < maxTurns; turn++) {
        // Get bot response from remote agent with full conversation context
        const lastUserMessage = updatedConversation.messages[updatedConversation.messages.length - 1];
        const botResponse = await sendMessageToRemoteAgent(lastUserMessage.content, updatedConversation.messages, currentThreadId);
        
        // Update thread ID if we received one from the response
        if (botResponse.metadata?.chatThreadId) {
          currentThreadId = botResponse.metadata.chatThreadId;
        }
        
        const botMessage: ConversationMessage = {
          role: 'assistant',
          content: botResponse.message || 'No response',
          timestamp: new Date(),
          metadata: botResponse.metadata
        };
        
        updatedConversation.messages.push(botMessage);
        
        // Update conversation in state
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversation.id ? { ...updatedConversation } : conv
          )
        );

        // Check if conversation should end (for auto mode or if we've reached max turns)
        if (useAutoEnding && turn >= 2) { // Start checking after at least 2 exchanges
          const shouldEnd = await shouldEndConversation(updatedConversation.messages, conversation.testCase);
          if (shouldEnd) {
            console.log(`Auto-ending conversation after ${turn + 1} turns`);
            break;
          }
        }

        // Generate next user message if not the last turn
        if (turn < maxTurns - 1) {
          // Use LLM to generate contextual follow-up message if API key is available
          let nextUserContent = "Can you tell me more about that?";
          
          if (apiKey) {
            try {
              nextUserContent = await generateContextualUserMessage(updatedConversation.messages, conversation.testCase);
            } catch (error) {
              console.error('Failed to generate contextual user message:', error);
            }
          }

          const nextUserMessage: ConversationMessage = {
            role: 'user',
            content: nextUserContent,
            timestamp: new Date()
          };
          
          updatedConversation.messages.push(nextUserMessage);
          
          // Update conversation in state
          setConversations(prev => 
            prev.map(conv => 
              conv.id === conversation.id ? { ...updatedConversation } : conv
            )
          );
        }
      }

      // Mark conversation as completed
      updatedConversation.completed = true;
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id ? updatedConversation : conv
        )
      );
      
      toast({
        title: "Remote Agent Conversation Complete",
        description: `Completed conversation with remote agent for: ${conversation.testCase}`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error simulating remote agent conversation:', error);
      toast({
        title: "Remote Agent Error",
        description: `Failed to simulate conversation with remote agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const startSimulation = async () => {
    console.log('ConversationSimulator: startSimulation called');
    console.log('ConversationSimulator: endpointUrl prop:', endpointUrl);
    console.log('ConversationSimulator: actualEndpointUrl:', actualEndpointUrl);
    console.log('ConversationSimulator: currentSession:', currentSession);
    console.log('ConversationSimulator: testConfig:', currentSession?.testConfig);
    
    if (!actualEndpointUrl) {
      console.log('ConversationSimulator: No endpoint URL found, showing error');
      toast({
        title: "Remote Agent Error",
        description: "Please configure your remote agent endpoint first.",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    setCurrentConversationIndex(0);
    
    // Process conversations sequentially
    for (let i = 0; i < conversations.length; i++) {
      setCurrentConversationIndex(i);
      await simulateConversation(conversations[i]);
    }
    
    setIsSimulating(false);
    
    // Check if all conversations are completed
    const allCompleted = conversations.every(conv => conv.completed);
    if (allCompleted) {
      toast({
        title: "All Conversations Complete",
        description: "All test case conversations have been simulated successfully with your remote agent.",
        variant: "default",
      });
      
      // Update session and notify parent component
      updateSimulatedConversations(conversations);
      onConversationsComplete(conversations);
    }
  };

  const getProgressPercentage = () => {
    if (conversations.length === 0) return 0;
    const completed = conversations.filter(conv => conv.completed).length;
    return (completed / conversations.length) * 100;
  };

  const getCurrentConversation = () => {
    return conversations[currentConversationIndex] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Conversation Simulation</h2>
          <p className="text-muted-foreground">
            {conversations.length > 0 
              ? `Simulating conversations for ${conversations.length} test cases with ${conversationMode === 'auto' ? 'auto-determined' : conversationMode === 'range' ? `${conversationRange.min}-${conversationRange.max}` : conversationTurns} turns each using your remote agent endpoint.`
              : "No test cases available for simulation"
            }
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600">Remote Agent Mode</span>
            {connectionTested && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            disabled={connectionStatus === 'testing'}
            variant="outline"
            className="gap-2"
          >
            {connectionStatus === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : connectionStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Connection OK
              </>
            ) : connectionStatus === 'error' ? (
              <>
                <X className="h-4 w-4 text-red-600" />
                Connection Failed
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <Button
            onClick={startSimulation}
            disabled={isSimulating || conversations.length === 0}
            className="btn-hero gap-2"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Simulation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Connection Status Display */}
      {connectionStatus !== 'unknown' && (
        <Card className={`metric-card ${connectionStatus === 'error' ? 'border-red-200 bg-red-50' : connectionStatus === 'success' ? 'border-green-200 bg-green-50' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              {connectionStatus === 'error' ? (
                <X className="h-5 w-5 text-red-600 mt-0.5" />
              ) : connectionStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
              )}
              <div className="flex-1">
                {connectionStatus === 'error' ? (
                  <>
                    <h4 className="font-medium text-red-800 mb-2">Connection Failed</h4>
                    <p className="text-sm text-red-700 mb-2">{connectionError}</p>
                    <div className="text-xs text-red-600">
                      <p><strong>Debug Information:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Authorization Token: {authorizationToken ? 'Present (extracted)' : 'Using default'}</li>
                        <li>Endpoint URL: {actualEndpointUrl}</li>
                        <li>Check browser console for detailed request/response logs</li>
                      </ul>
                      <p className="mt-2"><strong>Possible solutions:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check if your authorization token is still valid</li>
                        <li>Try extracting a fresh token using the curl command extractor</li>
                        <li>Verify the endpoint URL is correct</li>
                        <li>Check if the Graphy service is accessible</li>
                      </ul>
                    </div>
                  </>
                ) : connectionStatus === 'success' ? (
                  <>
                    <h4 className="font-medium text-green-800 mb-2">Connection Successful</h4>
                    <p className="text-sm text-green-700">Remote agent is responding correctly.</p>
                  </>
                ) : (
                  <>
                    <h4 className="font-medium text-blue-800 mb-2">Testing Connection</h4>
                    <p className="text-sm text-blue-700">Please wait while we test the connection...</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {conversations.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Simulation Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Progress: {conversations.filter(conv => conv.completed).length} / {conversations.length} conversations</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500" 
              style={{ width: `${getProgressPercentage()}%` }} 
            />
          </div>
          
          {isSimulating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Currently simulating: {getCurrentConversation()?.testCase}
              {currentTurn > 0 && ` (Turn ${currentTurn}/${conversationMode === 'range' ? `${conversationRange.min}-${conversationRange.max}` : conversationMode === 'auto' ? 'Auto' : conversationTurns})`}
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Evaluation Button - Show when all conversations are completed */}
      {conversations.length > 0 && conversations.every(conv => conv.completed) && onRunEvaluation && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Ready for Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                All conversations have been simulated successfully. You can now run the automated evaluation 
                to score the conversations based on your configured metrics.
              </p>
              <Button
                onClick={() => onRunEvaluation && onRunEvaluation(conversations)}
                className="btn-hero gap-2"
                size="lg"
              >
                <Gavel className="h-4 w-4" />
                Run Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Cases Status */}
      {conversations.length === 0 ? (
        <Card className="metric-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No test cases available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please generate test cases in the configuration step first
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.map((conversation, index) => (
          <Card 
            key={conversation.id} 
            className={`metric-card transition-all duration-200 ${
              conversation.completed ? 'ring-2 ring-green-500/20' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                {conversation.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                <span className="font-medium">Test Case:</span> {conversation.testCase}
              </p>
              
              {conversation.completed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {conversation.messages.length} messages
                </div>
              )}
              
              {index === currentConversationIndex && isSimulating && (
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Currently processing...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Current Conversation Preview */}
      {conversations.length > 0 && getCurrentConversation() && getCurrentConversation()!.messages.length > 0 && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle className="text-lg">Current Conversation Preview</CardTitle>
            <div className="text-sm text-muted-foreground">
              <p>Test Case: <span className="font-medium">{getCurrentConversation()?.testCase}</span></p>
              <p>First user message generated by conversation starter LLM based on test case scenario</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getCurrentConversation()!.messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationSimulator;
