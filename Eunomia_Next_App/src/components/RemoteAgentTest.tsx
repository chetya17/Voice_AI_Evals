import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Globe, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDataPersistence } from "@/contexts/DataPersistenceContext";

const RemoteAgentTest = () => {
  const { toast } = useToast();
  const { currentSession } = useDataPersistence();
  const [endpointUrl, setEndpointUrl] = useState("https://chetantalele.graphy.com/t/api/ai/chat-threads/messages/stream");
  const [testMessage, setTestMessage] = useState("hi");
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string>("");
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Load endpoint URL from current session configuration
  useEffect(() => {
    if (currentSession?.testConfig?.endpointUrl) {
      setEndpointUrl(currentSession.testConfig.endpointUrl);
    }
  }, [currentSession]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testConnection = async () => {
    addDebugLog('=== REMOTE AGENT TEST COMPONENT DEBUG ===');
    addDebugLog('Starting test connection...');
    addDebugLog(`Current endpoint URL: ${endpointUrl}`);
    addDebugLog(`Use CORS proxy: ${useCorsProxy}`);
    
    console.log('=== REMOTE AGENT TEST COMPONENT DEBUG ===');
    console.log('Starting test connection...');
    console.log('Current endpoint URL:', endpointUrl);
    console.log('Use CORS proxy:', useCorsProxy);
    
    setIsTesting(true);
    setConnectionError("");
    setConnectionDetails(null);
    
    try {
      const actualEndpointUrl = useCorsProxy 
        ? `https://cors-anywhere.herokuapp.com/${endpointUrl}`
        : endpointUrl;

      // Use extracted headers from curl command if available, otherwise use defaults
      const extractedHeaders = currentSession?.testConfig?.extractedHeaders || {};
      const extractedCookies = currentSession?.testConfig?.extractedCookies || {};
      
      // Build headers object - prioritize extracted headers, fallback to defaults
      const headers = {
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
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        // Override with extracted headers
        ...extractedHeaders,
        // Add cookies if available
        ...(Object.keys(extractedCookies).length > 0 && {
          'cookie': Object.entries(extractedCookies).map(([key, value]) => `${key}=${value}`).join('; ')
        })
      };

      // Request body from your curl command
      const requestBody = {
        "message": "hi",
        "avatar": {
          "id": "68b9d37fafa0498cc96f4f9f",
          "name": "Chetan  Talele"
        },
        "send_as": "learner",
        "metadata": {
          "assets": []
        },
        "channel": "web",
        "modality": "text"
      };

      addDebugLog(`Making request to: ${actualEndpointUrl}`);
      addDebugLog(`Request headers: ${JSON.stringify(headers, null, 2)}`);
      addDebugLog(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

      const response = await fetch(actualEndpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      addDebugLog(`Response status: ${response.status}`);
      addDebugLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog(`Error response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Try to read the response as text first to see what we get
      const responseText = await response.text();
      addDebugLog(`Response text: ${responseText}`);

      setIsConnected(true);
      setConnectionDetails({
        status: response.status,
        responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
        headers: Object.fromEntries(response.headers.entries())
      });

      toast({
        title: "Connection Successful",
        description: "Successfully connected to remote agent.",
        variant: "default",
      });

    } catch (error) {
      console.error('=== CONNECTION TEST EXCEPTION ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error:', error);
      
      addDebugLog(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsConnected(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(errorMessage);
      toast({
        title: "Connection Error",
        description: `Error testing connection: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestMessage = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please test connection first.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setResponse("");
    
    try {
      const actualEndpointUrl = useCorsProxy 
        ? `https://cors-anywhere.herokuapp.com/${endpointUrl}`
        : endpointUrl;

      // Use extracted headers from curl command if available, otherwise use defaults
      const extractedHeaders = currentSession?.testConfig?.extractedHeaders || {};
      const extractedCookies = currentSession?.testConfig?.extractedCookies || {};
      
      // Build headers object - prioritize extracted headers, fallback to defaults
      const headers = {
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
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        // Override with extracted headers
        ...extractedHeaders,
        // Add cookies if available
        ...(Object.keys(extractedCookies).length > 0 && {
          'cookie': Object.entries(extractedCookies).map(([key, value]) => `${key}=${value}`).join('; ')
        })
      };

      // Request body with the test message
      const requestBody = {
        "message": testMessage,
        "avatar": {
          "id": "68b9d37fafa0498cc96f4f9f",
          "name": "Chetan  Talele"
        },
        "send_as": "learner",
        "metadata": {
          "assets": []
        },
        "channel": "web",
        "modality": "text"
      };

      addDebugLog(`Sending message: ${testMessage}`);
      addDebugLog(`Making request to: ${actualEndpointUrl}`);

      const response = await fetch(actualEndpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      addDebugLog(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        addDebugLog(`Error response: ${errorText}`);
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
                
                addDebugLog(`Received SSE data: ${JSON.stringify(data, null, 2)}`);
                
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
                addDebugLog(`Failed to parse SSE data: ${parseError}`);
                console.error('Failed to parse SSE data:', parseError);
                console.error('Line that failed:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const responseData = {
        message: finalMessage || 'No response received',
        metadata
      };

      addDebugLog(`Final response: ${JSON.stringify(responseData, null, 2)}`);
      
      setResponse(JSON.stringify(responseData, null, 2));
      
      toast({
        title: "Message Sent",
        description: `Test message sent successfully. Response received.`,
        variant: "default",
      });
    } catch (error) {
      addDebugLog(`Send message failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Send Error",
        description: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Remote Agent Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint-url">Endpoint URL</Label>
            <Input
              id="endpoint-url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://chetantalele.graphy.com/t/api/ai/chat-threads/messages/stream"
            />
            {currentSession?.testConfig?.endpointUrl && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Endpoint URL loaded from curl command configuration</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Note: The Graphy API may block requests due to CORS policy. If you get CORS errors, try:
              <br />• Enable "Use CORS proxy" checkbox below
              <br />• Run Chrome with CORS disabled: <code>chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"</code>
              <br />• Check the CORS_INSTRUCTIONS.md file for detailed instructions
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-cors-proxy"
              checked={useCorsProxy}
              onCheckedChange={(checked) => setUseCorsProxy(checked as boolean)}
            />
            <Label htmlFor="use-cors-proxy" className="text-sm">
              Use CORS proxy (if getting CORS errors)
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={isTesting || !endpointUrl}
              variant="outline"
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Test Connection
            </Button>
            
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
            )}
          </div>
          
          {connectionError && (
            <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Connection Error:</h4>
              <p className="text-sm text-red-700 mb-2">{connectionError}</p>
              {connectionDetails && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer font-medium">Technical Details</summary>
                  <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
                    {JSON.stringify(connectionDetails, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          {isConnected && connectionDetails && (
            <div className="mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
              <h4 className="font-medium text-green-800 mb-2">Connection Details:</h4>
              <pre className="text-xs text-green-700 overflow-auto">
                {JSON.stringify(connectionDetails, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Send Test Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-message">Test Message</Label>
              <Input
                id="test-message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={sendTestMessage}
                disabled={isTesting || !testMessage}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Send Message
              </Button>
              
              {response && (
                <Button
                  onClick={() => setResponse("")}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>
            
            {response && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium mb-2">Response:</h4>
                <div className="space-y-3">
                  {(() => {
                    try {
                      const responseData = JSON.parse(response);
                      return (
                        <>
                          <div>
                            <span className="font-medium text-green-600">Message:</span>
                            <p className="text-sm text-muted-foreground mt-1">{responseData.message}</p>
                          </div>
                          
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium text-gray-600">Raw Response Data</summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                              {JSON.stringify(responseData, null, 2)}
                            </pre>
                          </details>
                        </>
                      );
                    } catch (e) {
                      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{response}</p>;
                    }
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      <Card className="metric-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setDebugLogs([])}
              variant="outline"
              size="sm"
            >
              Clear Logs
            </Button>
            <Button
              onClick={() => {
                const logs = debugLogs.join('\n');
                navigator.clipboard.writeText(logs);
                toast({
                  title: "Logs Copied",
                  description: "Debug logs copied to clipboard",
                  variant: "default",
                });
              }}
              variant="outline"
              size="sm"
            >
              Copy Logs
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto bg-muted/20 p-4 rounded-lg">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {debugLogs.length > 0 ? debugLogs.join('\n') : 'No debug logs yet. Try testing the connection.'}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemoteAgentTest;