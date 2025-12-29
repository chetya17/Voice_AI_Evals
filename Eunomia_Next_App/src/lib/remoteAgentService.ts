// Remote Agent Service for integrating with external chatbot endpoints
// Handles streaming responses and conversation management

import { 
  StreamingDataPreprocessor, 
  StreamingChunk, 
  ProcessedMessage,
  assembleStreamingMessage 
} from './streamingDataPreprocessor';

export interface RemoteAgentConfig {
  endpointUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  requestBody?: Record<string, any>;
  responseMode?: 'json' | 'sse'; // Add response mode configuration
  guidelines?: {
    testCaseGuideline: string;
    scoringGuideline: string;
    simulationGuideline: string;
  };
  agentType?: string;
  useCorsProxy?: boolean; // Add CORS proxy option
  authorizationToken?: string; // Add authorization token option
  cookies?: Record<string, string>; // Add cookies option
}

export interface RemoteAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RemoteAgentResponse {
  success: boolean;
  message?: string;
  suggestions?: string[];
  isSuggestions?: boolean;
  isFinal?: boolean;
  is_final?: boolean;
  close?: boolean;
  id?: string;
  chatThreadId?: string;
  sender?: {
    id: string;
    type: string;
  };
  timestamp?: string;
  metadata?: Record<string, any>;
  replyTo?: Record<string, any>;
  botResponseFailed?: boolean;
  creatorActionStatus?: string;
  actions?: {
    liked: boolean;
    disliked: boolean;
  };
  attributes?: {
    intent: string;
    language: string;
  };
  citations?: Array<{
    id: string;
    url: string | null;
    title: string;
    contentId: string | null;
    type: string;
    subtype: string;
    text: string;
  }>;
  cards?: any[];
  responseId?: string | null;
  thread?: {
    id: string;
    name: string;
    status: string;
    timestamps: {
      initiated: string;
      lastUpdated: string;
    };
    modality: string;
    avatarName: string;
    learnerName: string | null;
  };
}

export class RemoteAgentService {
  private config: RemoteAgentConfig;
  private chatThreadId: string | null = null;
  private streamingPreprocessor: StreamingDataPreprocessor;
  private apiKey: string | null = null;

  constructor(config: RemoteAgentConfig, apiKey?: string) {
    this.config = config;
    this.apiKey = apiKey || null;
    this.streamingPreprocessor = StreamingDataPreprocessor.create();
  }

  /**
   * Get the actual endpoint URL, potentially with CORS proxy
   */
  private getActualEndpointUrl(): string {
    if (this.config.useCorsProxy) {
      // Use a CORS proxy service - try multiple options
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://corsproxy.io/?'
      ];
      // Use the first proxy for now
      return `${corsProxies[0]}${encodeURIComponent(this.config.endpointUrl)}`;
    }
    return this.config.endpointUrl;
  }

  /**
   * Send a message to the remote agent and get a streaming response
   */
  async sendMessage(
    message: string,
    onChunk?: (chunk: RemoteAgentResponse) => void,
    onComplete?: (finalResponse: RemoteAgentResponse) => void,
    threadId?: string
  ): Promise<RemoteAgentResponse> {
    console.log('=== REMOTE AGENT SEND MESSAGE DEBUG ===');
    console.log('Input message:', message);
    console.log('Service config:', {
      endpointUrl: this.config.endpointUrl,
      responseMode: this.config.responseMode,
      hasApiKey: !!this.apiKey
    });
    const requestBody = {
      message,
      avatar: {
        id: "68b9d37fafa0498cc96f4f9f",
        name: "Chetan  Talele"
      },
      send_as: "learner",
      metadata: {
        assets: []
      },
      channel: "web",
      modality: "text",
      ...this.config.requestBody
    };

    const responseMode = this.config.responseMode || 'sse';
    
    // Create headers with configurable authorization token
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

    // Use provided authorization token or fallback to default
    if (this.config.authorizationToken) {
      defaultHeaders['authorization'] = this.config.authorizationToken;
    } else {
      defaultHeaders['authorization'] = 'Basic NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmI5OjY4YjlkMzUxOWEzZTI1NjVjZGExOWZiYT1iZDRiYmFmY2YzNTNmN2ZiMDM1NzUyNTBhZDI0NzRkOQ==';
    }

    // Use provided cookies or fallback to default
    if (this.config.cookies && Object.keys(this.config.cookies).length > 0) {
      const cookieString = Object.entries(this.config.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      defaultHeaders['cookie'] = cookieString;
    } else {
      defaultHeaders['cookie'] = 'id=6b697ab2-7e66-4ca6-b461-1693b3c3e987; c_login_token=1757071676300; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=en; SESSIONID=C0C46F67FC5FDA82337F372687C40FCE; amp_e56929=iXJPVyYBBY61NWrtk7ozhl...1j6epslhj.1j6epsqeo.0.0.0; amp_e56929_graphy.com=iXJPVyYBBY61NWrtk7ozhl.NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmJh..1j6epslke.1j6epsqlk.k.f.13';
    }

    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...this.config.headers
    };

    // Note: Authorization header should be provided in config.headers if needed
    // The apiKey parameter is used for LLM calls, not for the remote agent endpoint

    try {
      // Use thread ID if provided, otherwise use the stored one
      const currentThreadId = threadId || this.chatThreadId;
      const actualEndpointUrl = this.getActualEndpointUrl();
      
      // Append thread_id as query parameter if we have one
      const finalUrl = currentThreadId 
        ? `${actualEndpointUrl}?thread_id=${currentThreadId}`
        : actualEndpointUrl;
      
      console.log('=== REMOTE AGENT REQUEST DEBUG ===');
      console.log('Original Endpoint URL:', this.config.endpointUrl);
      console.log('Actual Endpoint URL:', actualEndpointUrl);
      console.log('Final URL with thread ID:', finalUrl);
      console.log('Current Thread ID:', currentThreadId);
      console.log('Use CORS Proxy:', this.config.useCorsProxy);
      console.log('Request Headers:', JSON.stringify(headers, null, 2));
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Response Mode:', responseMode);
      
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          ...headers
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response OK:', response.ok);
      console.log('Response Type:', response.type);
      console.log('Response URL:', response.url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== ERROR RESPONSE DEBUG ===');
        console.error('Error Status:', response.status);
        console.error('Error Status Text:', response.statusText);
        console.error('Error Response Body:', errorText);
        console.error('Error Headers:', Object.fromEntries(response.headers.entries()));
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      if (responseMode === 'sse') {
        console.log('=== SSE RESPONSE PROCESSING ===');
        // Handle Server-Sent Events
        if (!response.body) {
          console.error('No response body available');
          throw new Error('No response body');
        }

        console.log('Response body available, starting to read stream...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResponse: RemoteAgentResponse | null = null;
        let allChunks: StreamingChunk[] = [];
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream reading completed');
            break;
          }

          chunkCount++;
          console.log(`Reading chunk ${chunkCount}, size: ${value?.length || 0} bytes`);
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

          console.log(`Processing ${lines.length} lines from chunk ${chunkCount}`);
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            console.log('Processing line:', line);
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6); // Remove 'data: ' prefix
                console.log('JSON string to parse:', jsonStr);
                const data: RemoteAgentResponse = JSON.parse(jsonStr);
                
                console.log('Successfully parsed SSE data:', data);
                
                // Convert to StreamingChunk format
                const chunk: StreamingChunk = {
                  success: data.success,
                  message: data.message,
                  is_final: data.is_final || data.isFinal,
                  isFinal: data.isFinal || data.is_final,
                  close: data.close,
                  suggestions: data.suggestions,
                  isSuggestions: data.isSuggestions,
                  is_suggestions: data.isSuggestions,
                  id: data.id,
                  chat_thread_id: data.chatThreadId,
                  chatThreadId: data.chatThreadId,
                  sender: data.sender,
                  timestamp: data.timestamp,
                  metadata: data.metadata,
                  reply_to: data.replyTo,
                  replyTo: data.replyTo,
                  bot_response_failed: data.botResponseFailed,
                  botResponseFailed: data.botResponseFailed,
                  creator_action_status: data.creatorActionStatus,
                  creatorActionStatus: data.creatorActionStatus,
                  actions: data.actions,
                  attributes: data.attributes,
                  citations: data.citations,
                  cards: data.cards,
                  response_id: data.responseId,
                  responseId: data.responseId,
                  thread: data.thread
                };

                allChunks.push(chunk);
                console.log(`Added chunk ${allChunks.length} to collection`);
                
                // Update chat thread ID if provided
                if (data.chatThreadId) {
                  this.chatThreadId = data.chatThreadId;
                  console.log('Updated chat thread ID:', this.chatThreadId);
                }

                // Call chunk callback
                if (onChunk) {
                  console.log('Calling onChunk callback');
                  onChunk(data);
                }

                // Only process the final summarized message (ignore streaming chunks)
                if (data.isFinal || data.is_final) {
                  console.log('Found final response:', data);
                  // Use the final summarized message directly, don't process streaming chunks
                  finalResponse = data;
                }
              } catch (parseError) {
                console.error('=== SSE PARSE ERROR ===');
                console.error('Failed to parse SSE data:', parseError);
                console.error('Line that failed:', line);
                console.error('JSON string:', line.substring(6));
              }
            }
          }
        }

        console.log('=== SSE PROCESSING COMPLETE ===');
        console.log('Total chunks received:', allChunks.length);
        console.log('Final response found:', !!finalResponse);
        
        // Call complete callback
        if (onComplete && finalResponse) {
          console.log('Calling onComplete callback with final response');
          onComplete(finalResponse);
        }

        // If we didn't get a final response but we got some data, create a response
        if (!finalResponse) {
          console.log('No final response received, but stream completed');
          console.log('Available chunks:', allChunks.length);
          
          // Try to assemble message from all chunks
          const assembledMessage = assembleStreamingMessage(allChunks);
          if (assembledMessage) {
            console.log('Assembled message from chunks:', assembledMessage);
            return {
              success: true,
              message: assembledMessage.content,
              isFinal: true,
              suggestions: assembledMessage.metadata.suggestions,
              citations: assembledMessage.metadata.citations,
              thread: assembledMessage.metadata.thread
            };
          }
          
          console.log('Could not assemble message from chunks');
          return {
            success: true,
            message: 'Stream completed without final marker',
            isFinal: true
          };
        }

        console.log('Returning final response:', finalResponse);
        return finalResponse;
      } else {
        // Handle JSON response
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let finalResponse: RemoteAgentResponse;
        
        try {
          finalResponse = JSON.parse(responseText);
          console.log('Parsed JSON response:', finalResponse);
          
          // Update chat thread ID if provided
          if (finalResponse.chatThreadId) {
            this.chatThreadId = finalResponse.chatThreadId;
          }

          // Call chunk callback
          if (onChunk) {
            onChunk(finalResponse);
          }

          // Call complete callback
          if (onComplete) {
            onComplete(finalResponse);
          }

          return finalResponse;
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          console.error('Response text:', responseText);
          
          // Return a fallback response
          const fallbackResponse: RemoteAgentResponse = {
            success: true,
            message: responseText || 'Response received but could not be parsed',
            isFinal: true
          };
          
          if (onChunk) {
            onChunk(fallbackResponse);
          }
          
          if (onComplete) {
            onComplete(fallbackResponse);
          }
          
          return fallbackResponse;
        }
      }

    } catch (error) {
      console.error('=== REMOTE AGENT ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', (error as Error)?.message);
      console.error('Error stack:', (error as Error)?.stack);
      console.error('Full error object:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const corsError = new Error('Network request failed. This might be due to CORS policy or network connectivity issues. Try enabling CORS proxy in the configuration.');
        // @ts-ignore - cause property is available in newer JS versions
        corsError.cause = error;
        throw corsError;
      }
      
      throw error;
    }
  }

  /**
   * Simulate a conversation with the remote agent
   */
  async simulateConversation(
    testCase: string,
    conversationTurns: number, // -1 indicates auto mode
    onProgress?: (turn: number, message: RemoteAgentMessage) => void
  ): Promise<RemoteAgentMessage[]> {
    const messages: RemoteAgentMessage[] = [];
    
    // Generate first user message using LLM
    const firstUserMessage = await this.generateFirstUserMessage(testCase);
    
    const userMessage: RemoteAgentMessage = {
      role: 'user',
      content: firstUserMessage,
      timestamp: new Date()
    };
    
    messages.push(userMessage);
    if (onProgress) onProgress(0, userMessage);

    // Handle auto mode vs fixed mode
    if (conversationTurns === -1) {
      // Auto mode: continue until LLM decides conversation is complete
      return await this.simulateAutoConversation(messages, testCase, onProgress);
    } else {
      // Fixed mode: simulate exact number of turns
      return await this.simulateFixedConversation(messages, testCase, conversationTurns, onProgress);
    }
  }

  /**
   * Simulate conversation with fixed number of turns
   */
  private async simulateFixedConversation(
    messages: RemoteAgentMessage[],
    testCase: string,
    conversationTurns: number,
    onProgress?: (turn: number, message: RemoteAgentMessage) => void
  ): Promise<RemoteAgentMessage[]> {
    // Simulate conversation turns
    for (let turn = 0; turn < conversationTurns; turn++) {
      // Get bot response from remote agent
      const lastUserMessage = messages[messages.length - 1];
      const botResponse = await this.sendMessage(lastUserMessage.content, undefined, undefined, this.chatThreadId || undefined);
      
      const botMessage: RemoteAgentMessage = {
        role: 'assistant',
        content: botResponse.message || 'No response',
        timestamp: new Date(),
        metadata: {
          suggestions: botResponse.suggestions,
          citations: botResponse.citations,
          thread: botResponse.thread
        }
      };
      
      messages.push(botMessage);
      if (onProgress) onProgress(turn + 1, botMessage);

      // Generate next user message if not the last turn
      if (turn < conversationTurns - 1) {
        const nextUserMessage = await this.generateNextUserMessage(messages, testCase);
        
        const nextUserMsg: RemoteAgentMessage = {
          role: 'user',
          content: nextUserMessage,
          timestamp: new Date()
        };
        
        messages.push(nextUserMsg);
        if (onProgress) onProgress(turn + 1, nextUserMsg);
      }
    }

    return messages;
  }

  /**
   * Simulate conversation with auto mode - LLM decides when to stop
   */
  private async simulateAutoConversation(
    messages: RemoteAgentMessage[],
    testCase: string,
    onProgress?: (turn: number, message: RemoteAgentMessage) => void
  ): Promise<RemoteAgentMessage[]> {
    const maxTurns = 20; // Safety limit to prevent infinite loops
    let turn = 0;
    
    while (turn < maxTurns) {
      // Get bot response from remote agent
      const lastUserMessage = messages[messages.length - 1];
      const botResponse = await this.sendMessage(lastUserMessage.content, undefined, undefined, this.chatThreadId || undefined);
      
      const botMessage: RemoteAgentMessage = {
        role: 'assistant',
        content: botResponse.message || 'No response',
        timestamp: new Date(),
        metadata: {
          suggestions: botResponse.suggestions,
          citations: botResponse.citations,
          thread: botResponse.thread
        }
      };
      
      messages.push(botMessage);
      if (onProgress) onProgress(turn + 1, botMessage);

      // Check if conversation should continue using LLM
      const shouldContinue = await this.shouldContinueConversation(messages, testCase);
      
      if (!shouldContinue) {
        console.log(`Auto conversation ending at turn ${turn + 1} - LLM determined conversation is complete`);
        break;
      }

      // Generate next user message
      const nextUserMessage = await this.generateNextUserMessage(messages, testCase);
      
      const nextUserMsg: RemoteAgentMessage = {
        role: 'user',
        content: nextUserMessage,
        timestamp: new Date()
      };
      
      messages.push(nextUserMsg);
      if (onProgress) onProgress(turn + 1, nextUserMsg);
      
      turn++;
    }

    if (turn >= maxTurns) {
      console.log(`Auto conversation reached maximum turns (${maxTurns}) - ending conversation`);
    }

    return messages;
  }

  /**
   * Use LLM to determine if conversation should continue
   */
  private async shouldContinueConversation(
    messages: RemoteAgentMessage[],
    originalTestCase: string
  ): Promise<boolean> {
    if (!this.apiKey) {
      // If no API key, use a simple heuristic
      return messages.length < 10; // Stop after 10 messages
    }

    try {
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `You are an expert in conversation analysis. Analyze the following conversation and determine if it should continue.

ORIGINAL TEST CASE: ${originalTestCase}

CONVERSATION:
${conversationText}

ANALYSIS CRITERIA:
- Has the user's original question/issue been adequately addressed?
- Has the assistant provided sufficient information to resolve the test case?
- Is the conversation reaching a natural conclusion?
- Are there any remaining unresolved aspects that need discussion?

Consider the context of the test case and whether the conversation has achieved its purpose.

Respond with only "YES" if the conversation should continue, or "NO" if it should end.

Response:`;

      const response = await this.callLLMAPI(prompt);
      const shouldContinue = response.trim().toUpperCase().startsWith('YES');
      
      console.log(`LLM decision for conversation continuation: ${shouldContinue ? 'YES' : 'NO'}`);
      console.log(`LLM response: ${response}`);
      
      return shouldContinue;
    } catch (error) {
      console.error('Error determining conversation continuation:', error);
      // Fallback: continue for a reasonable number of turns
      return messages.length < 8;
    }
  }

  /**
   * Call LLM API to generate content
   */
  private async callLLMAPI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API key is required for LLM calls");
    }
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert in GenAI Evals. Return only the requested content without any additional text or explanations.

${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
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
      
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate first user message based on test case using conversation starter LLM
   */
  private async generateFirstUserMessage(testCase: string): Promise<string> {
    if (!this.apiKey) {
      return testCase; // Fallback to test case if no API key
    }

    try {
      const prompt = `You are an expert in simulating realistic user conversations with AI agents. Your task is to generate a natural first message that a real user would say to start a conversation based on a test scenario.

TEST SCENARIO: ${testCase}
AGENT TYPE: ${this.config.agentType || 'AI Agent'}
SYSTEM CONTEXT: Remote agent endpoint

GUIDELINES:
- Generate a natural, conversational first message that a real user would actually say
- Make it sound like a real person starting a conversation, not a test case description
- Include relevant context and details that a real user would mention
- Use natural language and conversational tone
- Don't mention that this is a test or evaluation
- Make it specific to the scenario but conversational
- Keep it concise but informative enough to start a meaningful conversation

${this.config.guidelines?.simulationGuideline ? `ADDITIONAL GUIDELINES: ${this.config.guidelines.simulationGuideline}` : ''}

Generate only the user's first message, no additional text or explanations.

User's first message:`;

      return await this.callLLMAPI(prompt);
    } catch (error) {
      console.error('Failed to generate conversation starter message:', error);
      return testCase; // Fallback to test case if LLM fails
    }
  }

  /**
   * Generate next user message based on conversation history
   */
  private async generateNextUserMessage(
    messages: RemoteAgentMessage[],
    originalTestCase: string
  ): Promise<string> {
    // For now, generate a simple follow-up message
    // In a real implementation, you might want to use an LLM to generate more natural responses
    const lastBotMessage = messages.filter(m => m.role === 'assistant').pop();
    
    if (lastBotMessage?.metadata?.suggestions && lastBotMessage.metadata.suggestions.length > 0) {
      // Use one of the suggestions if available
      return lastBotMessage.metadata.suggestions[0];
    }
    
    // Generate a simple follow-up
    return "Can you tell me more about that?";
  }

  /**
   * Simple test method to verify the endpoint is reachable
   */
  async simpleTest(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('=== SIMPLE TEST DEBUG ===');
      console.log('Testing endpoint:', this.config.endpointUrl);
      
      // Create headers with configurable authorization token
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

      // Use provided authorization token or fallback to default
      if (this.config.authorizationToken) {
        defaultHeaders['authorization'] = this.config.authorizationToken;
      } else {
        defaultHeaders['authorization'] = 'Basic NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmI5OjY4YjlkMzUxOWEzZTI1NjVjZGExOWZiYT1iZDRiYmFmY2YzNTNmN2ZiMDM1NzUyNTBhZDI0NzRkOQ==';
      }

      // Use provided cookies or fallback to default
      if (this.config.cookies && Object.keys(this.config.cookies).length > 0) {
        const cookieString = Object.entries(this.config.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        defaultHeaders['cookie'] = cookieString;
      } else {
        defaultHeaders['cookie'] = 'SESSIONID=2B6CAD1413EE0DB6B1C9494796C5A7A3; id=6b697ab2-7e66-4ca6-b461-1693b3c3e987; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=en; c_login_token=1757071676300; amp_e56929=iXJPVyYBBY61NWrtk7ozhl...1j6e3oe28.1j6e3pdgv.0.0.0; amp_e56929_graphy.com=iXJPVyYBBY61NWrtk7ozhl.NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmJh..1j6e3oe28.1j6e3pdkb.8.7.f';
      }

      const headers: Record<string, string> = {
        ...defaultHeaders,
        ...this.config.headers
      };

      // Note: Authorization header should be provided in config.headers if needed

      // Try a simple fetch with the correct headers
      const actualEndpointUrl = this.getActualEndpointUrl();
      const response = await fetch(actualEndpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: "test",
          avatar: {
            id: "68b9d37fafa0498cc96f4f9f",
            name: "Chetan Talele"
          },
          send_as: "learner",
          metadata: {
            assets: []
          },
          channel: "web",
          modality: "text",
          user: {
            id: "68b9d37fafa0498cc96f4f9f",
            name: "Chetan Talele",
            role: "learner",
            type: "user"
          },
          session: {
            id: "68b9d37fafa0498cc96f4f9f",
            type: "user_session"
          }
        })
      });

      console.log('Simple test response status:', response.status);
      console.log('Simple test response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simple test error response:', errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          details: { status: response.status, response: errorText }
        };
      }

      return {
        success: true,
        details: { status: response.status }
      };

    } catch (error: any) {
      console.error('Simple test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        details: { name: error.name, message: error.message }
      };
    }
  }

  /**
   * Test the connection to the remote agent
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('=== TEST CONNECTION DEBUG ===');
      console.log('Testing connection to:', this.config.endpointUrl);
      console.log('Service config:', {
        endpointUrl: this.config.endpointUrl,
        responseMode: this.config.responseMode,
        hasHeaders: Object.keys(this.config.headers || {}).length > 0
      });
      
      // Create headers with configurable authorization token
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

      // Use provided authorization token or fallback to default
      if (this.config.authorizationToken) {
        defaultHeaders['authorization'] = this.config.authorizationToken;
      } else {
        defaultHeaders['authorization'] = 'Basic NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmI5OjY4YjlkMzUxOWEzZTI1NjVjZGExOWZiYT1iZDRiYmFmY2YzNTNmN2ZiMDM1NzUyNTBhZDI0NzRkOQ==';
      }

      // Use provided cookies or fallback to default
      if (this.config.cookies && Object.keys(this.config.cookies).length > 0) {
        const cookieString = Object.entries(this.config.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
        defaultHeaders['cookie'] = cookieString;
      } else {
        defaultHeaders['cookie'] = 'SESSIONID=2B6CAD1413EE0DB6B1C9494796C5A7A3; id=6b697ab2-7e66-4ca6-b461-1693b3c3e987; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=en; c_login_token=1757071676300; amp_e56929=iXJPVyYBBY61NWrtk7ozhl...1j6e3oe28.1j6e3pdgv.0.0.0; amp_e56929_graphy.com=iXJPVyYBBY61NWrtk7ozhl.NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmJh..1j6e3oe28.1j6e3pdkb.8.7.f';
      }

      const headers: Record<string, string> = {
        ...defaultHeaders,
        ...this.config.headers
      };

      // Note: Authorization header should be provided in config.headers if needed

      // First, try a simple fetch to check if the endpoint is reachable
      const responseMode = this.config.responseMode || 'sse';
      const actualEndpointUrl = this.getActualEndpointUrl();
      const testResponse = await fetch(actualEndpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: "Hello",
          avatar: {
            id: "68b9d37fafa0498cc96f4f9f",
            name: "Chetan Talele"
          },
          send_as: "learner",
          metadata: {
            assets: []
          },
          channel: "web",
          modality: "text",
          user: {
            id: "68b9d37fafa0498cc96f4f9f",
            name: "Chetan Talele",
            role: "learner",
            type: "user"
          },
          session: {
            id: "68b9d37fafa0498cc96f4f9f",
            type: "user_session"
          }
        })
      });

      console.log('Test response status:', testResponse.status);
      console.log('Test response headers:', Object.fromEntries(testResponse.headers.entries()));
      console.log('Test response OK:', testResponse.ok);
      console.log('Test response type:', testResponse.type);

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('=== TEST CONNECTION ERROR ===');
        console.error('Error status:', testResponse.status);
        console.error('Error status text:', testResponse.statusText);
        console.error('Error response body:', errorText);
        return {
          success: false,
          error: `HTTP ${testResponse.status}: ${testResponse.statusText} - ${errorText}`,
          details: {
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers.entries()),
            responseBody: errorText
          }
        };
      }

      if (responseMode === 'sse') {
        // Try to read SSE response
        const reader = testResponse.body?.getReader();
        if (!reader) {
          return {
            success: false,
            error: 'No response body received',
            details: { status: testResponse.status }
          };
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let hasValidData = false;
        
        // Read multiple chunks to get a complete response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Check if we have any complete data lines
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6);
                const data = JSON.parse(jsonStr);
                if (data.success !== undefined) {
                  hasValidData = true;
                  break;
                }
              } catch (e) {
                // Continue checking other lines
              }
            }
          }
          
          if (hasValidData) break;
        }
        
        console.log('SSE Response buffer:', buffer);

        // Check if we found valid data
        if (hasValidData) {
          return {
            success: true,
            details: { 
              status: testResponse.status,
              responsePreview: buffer.substring(0, 200) + (buffer.length > 200 ? '...' : ''),
              hasValidData
            }
          };
        } else {
          return {
            success: false,
            error: 'Invalid response format - no valid SSE data found',
            details: { 
              status: testResponse.status,
              responsePreview: buffer.substring(0, 200)
            }
          };
        }
      } else {
        // Try to read the response as JSON
        const responseText = await testResponse.text();
        console.log('Test response text:', responseText);
        
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed test response:', data);
          
          return {
            success: true,
            details: { 
              status: testResponse.status,
              responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
              parsedData: data
            }
          };
        } catch (parseError) {
          console.log('Failed to parse JSON, but response received:', responseText);
          
          // Even if it's not JSON, if we got a response, the connection works
          return {
            success: true,
            details: { 
              status: testResponse.status,
              responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
              note: 'Response received but not valid JSON'
            }
          };
        }
      }

    } catch (error: any) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Get the current chat thread ID
   */
  getChatThreadId(): string | null {
    return this.chatThreadId;
  }

  /**
   * Reset the chat thread (start a new conversation)
   */
  resetChatThread(): void {
    this.chatThreadId = null;
  }
}

// Factory function to create a remote agent service
export function createRemoteAgentService(config: RemoteAgentConfig, apiKey?: string): RemoteAgentService {
  return new RemoteAgentService(config, apiKey);
}

// Default configuration for the provided endpoint
export const DEFAULT_REMOTE_AGENT_CONFIG: RemoteAgentConfig = {
  endpointUrl: 'https://chetantalele.graphy.com/t/api/ai/chat-threads/messages/stream',
  responseMode: 'sse', // Set to SSE mode to handle streaming data
  useCorsProxy: false, // Disable CORS proxy by default - requires browser with CORS disabled
  headers: {
    'accept': '*/*, text/event-stream',
    'accept-language': 'en-US,en;q=0.9,te;q=0.8,bn;q=0.7',
    'authorization': 'Basic NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmI5OjY4YjlkMzUxOWEzZTI1NjVjZGExOWZiYT1iZDRiYmFmY2YzNTNmN2ZiMDM1NzUyNTBhZDI0NzRkOQ==',
    'content-type': 'application/json',
    'origin': 'https://chetantalele.graphy.com',
    'referer': 'https://chetantalele.graphy.com/talk/unspecified',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'cookie': 'id=6b697ab2-7e66-4ca6-b461-1693b3c3e987; c_login_token=1757071676300; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=en; SESSIONID=C0C46F67FC5FDA82337F372687C40FCE; amp_e56929=iXJPVyYBBY61NWrtk7ozhl...1j6epslhj.1j6epsqeo.0.0.0; amp_e56929_graphy.com=iXJPVyYBBY61NWrtk7ozhl.NjhiOWQzNTE5YTNlMjU2NWNkYTE5ZmJh..1j6epslke.1j6epsqlk.k.f.13'
  },
  requestBody: {
    avatar: {
      id: "68b9d37fafa0498cc96f4f9f",
      name: "Chetan  Talele"
    },
    send_as: "learner",
    metadata: {
      assets: []
    },
    channel: "web",
    modality: "text"
  }
};
