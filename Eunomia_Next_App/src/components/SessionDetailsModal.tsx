import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  MessageSquare, 
  Award, 
  Target, 
  TrendingUp,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { EvaluationSession } from '@/contexts/DataPersistenceContext';

interface SessionDetailsModalProps {
  session: EvaluationSession | null;
  open: boolean;
  onClose: () => void;
}

const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({ session, open, onClose }) => {
  if (!session) return null;

  const averageScore = session.conversationScores.length > 0
    ? session.conversationScores.reduce((sum, score) => sum + score.averageScore, 0) / session.conversationScores.length
    : 0;

  const totalTestCases = session.testConfig.generatedTestCases?.length || 0;
  const completedConversations = session.simulatedConversations.filter(c => c.completed).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{session.name}</span>
            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Created: {new Date(session.createdAt).toLocaleDateString()} • 
            Updated: {new Date(session.updatedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="testcases">Test Cases</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="scores">Scores</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-auto">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Test Cases</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{totalTestCases}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Conversations</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{completedConversations}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-purple-600" />
                        <p className="text-xs text-muted-foreground">Scores</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{session.conversationScores.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{averageScore.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Configuration Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {session.agentDescription && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Agent Description</p>
                        <p className="text-sm">{session.agentDescription}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Chatbot Type</p>
                        <p className="text-sm">{session.testConfig.chatbotType || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Conversation Turns</p>
                        <p className="text-sm">{session.testConfig.conversationTurns}</p>
                      </div>
                    </div>
                    {session.testConfig.endpointUrl && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Endpoint URL</p>
                        <p className="text-sm font-mono text-xs bg-muted p-2 rounded">{session.testConfig.endpointUrl}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scoring Metrics */}
                {session.testConfig.scoringMetrics && session.testConfig.scoringMetrics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Scoring Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {session.testConfig.scoringMetrics.map((metric, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-muted/20">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{metric.name}</p>
                              <Badge variant="outline">{metric.totalPoints} pts</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{metric.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Test Cases Tab */}
          <TabsContent value="testcases" className="flex-1 overflow-auto">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-4">
                {totalTestCases > 0 ? (
                  session.testConfig.generatedTestCases?.map((testCase, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs">TC-{idx + 1}</Badge>
                          <p className="text-sm flex-1">{testCase}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No test cases available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="flex-1 overflow-auto">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {session.simulatedConversations.length > 0 ? (
                  session.simulatedConversations.map((conv, idx) => (
                    <Card key={conv.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Conversation {idx + 1}
                          </CardTitle>
                          {conv.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{conv.testCase}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {conv.messages.map((msg, msgIdx) => (
                            <div 
                              key={msgIdx} 
                              className={`p-2 rounded text-xs ${
                                msg.role === 'user' 
                                  ? 'bg-blue-50 text-blue-900' 
                                  : 'bg-green-50 text-green-900'
                              }`}
                            >
                              <p className="font-semibold mb-1">
                                {msg.role === 'user' ? 'User' : 'Assistant'}:
                              </p>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No conversations available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Scores Tab */}
          <TabsContent value="scores" className="flex-1 overflow-auto">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {session.conversationScores.length > 0 ? (
                  session.conversationScores.map((score, idx) => (
                    <Card key={score.conversationId}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Score {idx + 1}</CardTitle>
                          <Badge variant="outline" className="text-sm">
                            {score.averageScore.toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{score.testCase}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {score.metricScores.map((metric, metricIdx) => (
                            <div key={metricIdx} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm">{metric.metricName}</p>
                                <div className="flex items-center gap-2">
                                  {metric.isNotApplicable ? (
                                    <Badge variant="secondary" className="text-xs">N/A</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      {metric.score}/{metric.maxScore}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{metric.feedback}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No scores available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsModal;

