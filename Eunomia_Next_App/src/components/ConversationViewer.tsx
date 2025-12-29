import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  User, 
  Bot, 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock
} from "lucide-react";
import { SimulatedConversation, ConversationMessage } from "./ConversationSimulator";

interface ConversationViewerProps {
  conversations: SimulatedConversation[];
  chatbotType: string;
  systemPrompt: string;
  onProceedToScoring: () => void;
}

const ConversationViewer = ({ 
  conversations, 
  chatbotType, 
  systemPrompt,
  onProceedToScoring 
}: ConversationViewerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.testCase.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCompleted === null || conversation.completed === filterCompleted;
    return matchesSearch && matchesFilter;
  });

  const toggleConversationExpansion = (conversationId: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  const expandAllConversations = () => {
    const allIds = new Set(conversations.map(conv => conv.id));
    setExpandedConversations(allIds);
  };

  const collapseAllConversations = () => {
    setExpandedConversations(new Set());
  };

  const getConversationStats = () => {
    const total = conversations.length;
    const completed = conversations.filter(conv => conv.completed).length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const avgMessagesPerConversation = total > 0 ? (totalMessages / total).toFixed(1) : 0;
    
    return { total, completed, totalMessages, avgMessagesPerConversation };
  };

  const stats = getConversationStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Conversation Viewer</h2>
          <p className="text-muted-foreground">
            {conversations.length > 0 
              ? `Review ${conversations.length} simulated conversations for ${chatbotType} chatbot`
              : "No conversations available for review"
            }
          </p>
        </div>
        <Button
          onClick={onProceedToScoring}
          className="btn-hero gap-2"
          disabled={conversations.length === 0 || conversations.every(conv => !conv.completed)}
        >
          <FileText className="h-4 w-4" />
          Proceed to Scoring
        </Button>
      </div>

      {/* Statistics Overview */}
      {conversations.length === 0 ? (
        <Card className="metric-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please complete conversation simulation first
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgMessagesPerConversation}</p>
                <p className="text-xs text-muted-foreground">Avg Messages/Conv</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* System Prompt Display */}
      {conversations.length > 0 && (
        <Card className="metric-card">
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border">
            {systemPrompt}
          </p>
        </CardContent>
        </Card>
      )}

      {/* Controls */}
      {conversations.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterCompleted(null)}
              className={filterCompleted === null ? "bg-primary text-primary-foreground" : ""}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterCompleted(true)}
              className={filterCompleted === true ? "bg-primary text-primary-foreground" : ""}
            >
              Completed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterCompleted(false)}
              className={filterCompleted === false ? "bg-primary text-primary-foreground" : ""}
            >
              Pending
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAllConversations}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllConversations}
              className="gap-2"
            >
              <EyeOff className="h-4 w-4" />
              Collapse All
            </Button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length > 0 && (
        <div className="space-y-4">
          {filteredConversations.length === 0 ? (
            <Card className="metric-card">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No conversations found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredConversations.map((conversation, index) => (
              <Card key={conversation.id} className="metric-card">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleConversationExpansion(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        {conversation.completed ? (
                          <Badge variant="default" className="bg-green-500">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {conversation.messages.length} messages
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {conversation.completed ? "Click to view" : "Not started"}
                      </span>
                      {expandedConversations.has(conversation.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground mt-2">
                    {conversation.testCase}
                  </p>
                </CardHeader>
                
                {expandedConversations.has(conversation.id) && (
                  <CardContent className="pt-0">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conversation.messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No messages yet - conversation not started
                        </p>
                      ) : (
                        conversation.messages.map((message, msgIndex) => (
                          <div 
                            key={msgIndex} 
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
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationViewer;
