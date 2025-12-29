import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FolderOpen, 
  Trash2, 
  Clock, 
  CheckCircle, 
  Play,
  Settings,
  MessageSquare,
  Target,
  BarChart3,
  Calendar,
  Edit3
} from "lucide-react";
import { useDataPersistence, EvaluationSession } from "@/contexts/DataPersistenceContext";
import { useToast } from "@/hooks/use-toast";

interface SessionManagerProps {
  onStartNewSession: () => void;
  onLoadSession: (session: EvaluationSession) => void;
}

const SessionManager = ({ onStartNewSession, onLoadSession }: SessionManagerProps) => {
  const { savedSessions, deleteSession, clearCurrentSession } = useDataPersistence();
  const { toast } = useToast();
  const [newSessionName, setNewSessionName] = useState("");
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Session Name Required",
        description: "Please enter a name for your new session.",
        variant: "destructive",
      });
      return;
    }

    onStartNewSession();
    setNewSessionName("");
    setShowNewSessionForm(false);
  };

  const handleLoadSession = (session: EvaluationSession) => {
    onLoadSession(session);
    toast({
      title: "Session Loaded",
      description: `Loaded session: ${session.name}`,
      variant: "default",
    });
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    if (confirm(`Are you sure you want to delete the session "${sessionName}"? This action cannot be undone.`)) {
      deleteSession(sessionId);
      toast({
        title: "Session Deleted",
        description: `Deleted session: ${sessionName}`,
        variant: "default",
      });
    }
  };

  const handleStartEditing = (session: EvaluationSession) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleSaveEdit = (sessionId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Session Name Required",
        description: "Please enter a name for your session.",
        variant: "destructive",
      });
      return;
    }

    // Update the session name in localStorage
    const updatedSessions = savedSessions.map(s => 
      s.id === sessionId ? { ...s, name: editingName.trim() } : s
    );
    localStorage.setItem('NeuroTest_evaluation_sessions', JSON.stringify(updatedSessions));
    
    // Reload the page to reflect changes
    window.location.reload();
    
    setEditingSessionId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingName("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'simulated':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'scored':
        return <Target className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <BarChart3 className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'bg-blue-100 text-blue-800';
      case 'simulated':
        return 'bg-green-100 text-green-800';
      case 'scored':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'configured':
        return 'Configured';
      case 'simulated':
        return 'Simulated';
      case 'scored':
        return 'Scored';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressInfo = (session: EvaluationSession) => {
    const { testConfig, simulatedConversations, conversationScores } = session;
    
    let progress = 0;
    let currentStep = "Not Started";
    
    if (testConfig.chatbotType && testConfig.systemPrompt) {
      progress = 25;
      currentStep = "Configured";
    }
    
    if (simulatedConversations.length > 0 && simulatedConversations.every(conv => conv.completed)) {
      progress = 50;
      currentStep = "Simulated";
    }
    
    if (conversationScores.length > 0) {
      progress = 75;
      currentStep = "Scored";
    }
    
    if (session.status === 'completed') {
      progress = 100;
      currentStep = "Completed";
    }
    
    return { progress, currentStep };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Session Management</h2>
          <p className="text-muted-foreground">Manage your evaluation sessions and continue where you left off</p>
        </div>
        <Button
          onClick={() => setShowNewSessionForm(true)}
          className="btn-hero gap-2"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* New Session Form */}
      {showNewSessionForm && (
        <Card className="metric-card">
          <CardHeader>
            <CardTitle>Create New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="session-name" className="text-sm font-medium">
                Session Name
              </label>
              <Input
                id="session-name"
                placeholder="Enter a descriptive name for your session..."
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateSession} disabled={!newSessionName.trim()}>
                Create Session
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewSessionForm(false);
                  setNewSessionName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Sessions */}
      {savedSessions.length === 0 ? (
        <Card className="metric-card">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No saved sessions yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first evaluation session to get started
            </p>
            <Button onClick={() => setShowNewSessionForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedSessions.map((session) => {
            const { progress, currentStep } = getProgressInfo(session);
            
            return (
              <Card key={session.id} className="metric-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-sm font-medium"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(session.id)}
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(session.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{session.name}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditing(session)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(session.status)}
                      <Badge className={getStatusColor(session.status)}>
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(session.updatedAt)}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{currentStep}</p>
                  </div>
                  
                  {/* Session Info */}
                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="text-foreground">{session.testConfig.chatbotType || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Test Cases:</span>
                      <span className="text-foreground">{session.testConfig.testCases || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversations:</span>
                      <span className="text-foreground">{session.simulatedConversations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scores:</span>
                      <span className="text-foreground">{session.conversationScores.length}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLoadSession(session)}
                      className="flex-1 gap-2"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSession(session.id, session.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionManager;
