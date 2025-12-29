"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import TestConfiguration from "@/components/TestConfiguration";
import ConversationSimulator from "@/components/ConversationSimulator";
import ConversationViewer from "@/components/ConversationViewer";
import AutomatedScoring from "@/components/AutomatedScoring";
import ScoreCompilation from "@/components/ScoreCompilation";
import RemoteAgentTest from "@/components/RemoteAgentTest";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { useDataPersistence, TestConfig, SimulatedConversation, ConversationScore } from "@/contexts/DataPersistenceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gavel, Star, MessageSquare, Play, Eye, Target, TrendingUp, Plus, BarChart3 } from "lucide-react";

const Index = () => {
  const { apiKey } = useApiKey();
  const { 
    currentSession, 
    createNewSession, 
    updateTestConfig, 
    updateSimulatedConversations, 
    updateConversationScores,
    saveSession,
    clearCurrentSessionForNewEval,
    canNavigateTo
  } = useDataPersistence();
  
    const [activeView, setActiveView] = useState("dashboard");
  const [userManuallyNavigated, setUserManuallyNavigated] = useState(false);
  
  // Add effect to log activeView changes
  useEffect(() => {
    console.log('Index: activeView state changed to:', activeView);
  }, [activeView]);
  
  // Debug wrapper for setActiveView
  const setActiveViewWithDebug = (view: string) => {
    console.log(`Index: setActiveViewWithDebug called: ${activeView} -> ${view}`);
    console.log(`Index: Current session:`, currentSession);
    console.log(`Index: canNavigateTo(${view}):`, canNavigateTo(view));
    console.log(`Index: About to call setActiveView(${view})`);
    
    // Mark that user is manually navigating
    if (view === "dashboard") {
      setUserManuallyNavigated(true);
      console.log('Index: User manually navigating to dashboard, setting flag');
    } else if (activeView === "dashboard" && view !== "dashboard") {
      // User is leaving dashboard, reset the flag
      setUserManuallyNavigated(false);
      console.log('Index: User leaving dashboard, resetting manual navigation flag');
    }
    
    setActiveView(view);
    console.log(`Index: setActiveView(${view}) called`);
  };
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  // Set initial view based on current session status
  useEffect(() => {
    console.log('Current session changed:', currentSession);
    if (currentSession) {
      // Only auto-navigate if we're still on dashboard (initial load) and user hasn't manually navigated
      if (activeView === "dashboard" && !userManuallyNavigated) {
        console.log('On dashboard and user has not manually navigated, checking for auto-navigation');
        // If we just created a new session, go to configure
        if (currentSession.status === 'configured' && !currentSession.testConfig.chatbotType) {
          console.log('New session created, navigating to configure');
          setActiveViewWithDebug("configure");
        } else if (currentSession.status === 'configured' && currentSession.testConfig.chatbotType) {
          console.log('Session configured, navigating to configure');
          setActiveViewWithDebug("configure");
        } else if (currentSession.status === 'simulated' || currentSession.simulatedConversations.length > 0) {
          console.log('Session simulated, navigating to simulation');
          setActiveViewWithDebug("simulation");
        } else if (currentSession.conversationScores.length > 0) {
          console.log('Session scored, navigating to results');
          setActiveViewWithDebug("results");
        }
      } else if (activeView === "dashboard" && userManuallyNavigated) {
        console.log('User manually navigated to dashboard, skipping auto-navigation');
      } else {
        console.log('Not on dashboard, skipping auto-navigation. Current view:', activeView);
      }
    }
  }, [currentSession, userManuallyNavigated]); // Add userManuallyNavigated dependency

  const handleStartTest = () => {
    if (!currentSession) {
      setShowSessionPrompt(true);
    } else {
      // Clear current session data for new evaluation while preserving saved results
      console.log('Index: Starting new evaluation, clearing current session data');
      clearCurrentSessionForNewEval();
      setUserManuallyNavigated(false); // Reset flag for new evaluation
      setShowSessionPrompt(true);
    }
  };

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      createNewSession(newSessionName.trim());
      setNewSessionName("");
      setShowSessionPrompt(false);
      // Reset manual navigation flag for new sessions
      setUserManuallyNavigated(false);
      console.log('Index: New session created, resetting manual navigation flag');
      // Don't automatically navigate - let the useEffect handle it
    }
  };

  const handleTestConfigured = (config: Omit<TestConfig, 'apiKey'>) => {
    console.log('handleTestConfigured called with config:', config);
    if (currentSession) {
      console.log('Current session exists, updating test config');
      updateTestConfig(config);
      console.log('Test config updated, navigating to simulation');
      setActiveViewWithDebug("simulation");
    } else {
      console.log('No current session found');
    }
  };

  const handleConversationsComplete = (conversations: SimulatedConversation[]) => {
    if (currentSession) {
      updateSimulatedConversations(conversations);
      setActiveViewWithDebug("viewer");
    }
  };

  const handleProceedToScoring = () => {
    setActiveViewWithDebug("scoring");
  };

  const handleScoringComplete = (scores: ConversationScore[]) => {
    if (currentSession) {
      updateConversationScores(scores);
      saveSession();
      setActiveViewWithDebug("results");
    }
  };

  const handleLoadSession = (session: any) => {
    // The session is already loaded by the context
    // Reset manual navigation flag when loading sessions
    setUserManuallyNavigated(false);
    console.log('Index: Session loaded, resetting manual navigation flag');
    
    // Just navigate to the appropriate view
    if (session.status === 'configured' && session.testConfig.chatbotType) {
      setActiveViewWithDebug("configure");
    } else if (session.status === 'simulated' || session.simulatedConversations.length > 0) {
      setActiveViewWithDebug("simulation");
    } else if (session.conversationScores.length > 0) {
      setActiveViewWithDebug("results");
    }
  };


  const renderActiveView = () => {
    console.log('Index: renderActiveView called with activeView:', activeView);
    console.log('Index: Current session:', currentSession);
    console.log('Index: Session scores count:', currentSession?.conversationScores?.length);
    
    switch (activeView) {
      case "dashboard":
        console.log('Index: Rendering Dashboard');
        return <Dashboard 
          onStartTest={handleStartTest} 
          onLoadSession={handleLoadSession}
          activeView={activeView}
          onViewChange={setActiveViewWithDebug}
        />;
      
      case "configure":
        console.log('Index: Rendering TestConfiguration');
        if (!currentSession) {
          console.log('Index: No current session for configure view');
          return <div>No active session</div>;
        }
        return <TestConfiguration onStartTest={handleTestConfigured} />;
      
      case "simulation":
        console.log('Index: Rendering ConversationSimulator');
        if (!currentSession || !currentSession.testConfig) {
          console.log('Index: No test configuration for simulation view');
          return <div>No test configuration found</div>;
        }
        
        console.log('Index: Passing endpointUrl to ConversationSimulator:', currentSession.testConfig.endpointUrl);
        console.log('Index: Full testConfig:', currentSession.testConfig);
        
        return (
          <ConversationSimulator
            testCases={currentSession.testConfig.generatedTestCases && currentSession.testConfig.generatedTestCases.length > 0 
              ? currentSession.testConfig.generatedTestCases 
              : Array.from({ length: currentSession.testConfig.testCases }, (_, i) => `Test Case ${i + 1}`)
            }
            systemPrompt={currentSession.testConfig.systemPrompt}
            chatbotType={currentSession.testConfig.chatbotType}
            conversationTurns={currentSession.testConfig.conversationTurns}
            conversationMode={currentSession.testConfig.conversationMode || 'fixed'}
            endpointUrl={currentSession.testConfig.endpointUrl}
            endpointApiKey={currentSession.testConfig.endpointApiKey}
            guidelines={currentSession.testConfig.guidelines}
            agentType={currentSession.testConfig.agentType}
            apiKey={apiKey}
            useCorsProxy={currentSession.testConfig.useCorsProxy || false}
            authorizationToken={currentSession.testConfig.authorizationToken}
            extractedHeaders={currentSession.testConfig.extractedHeaders}
            extractedCookies={currentSession.testConfig.extractedCookies}
            onConversationsComplete={handleConversationsComplete}
            onRunEvaluation={(conversations) => {
              // Store the conversations and go directly to scoring
              if (currentSession) {
                updateSimulatedConversations(conversations);
                setActiveViewWithDebug("scoring");
              }
            }}
          />
        );
      
      case "viewer":
        console.log('Index: Rendering ConversationViewer');
        if (!currentSession || currentSession.simulatedConversations.length === 0) return <div>No conversations to view</div>;
        return (
          <ConversationViewer
            conversations={currentSession.simulatedConversations}
            chatbotType={currentSession.testConfig.chatbotType}
            systemPrompt={currentSession.testConfig.systemPrompt}
            onProceedToScoring={handleProceedToScoring}
          />
        );
      
      case "scoring":
        console.log('Index: Rendering AutomatedScoring');
        if (!currentSession || currentSession.simulatedConversations.length === 0) return <div>No conversations to score</div>;
        return (
          <AutomatedScoring
            conversations={currentSession.simulatedConversations}
            scoringMetrics={currentSession.testConfig.scoringMetrics}
            chatbotType={currentSession.testConfig.chatbotType}
            systemPrompt={currentSession.testConfig.systemPrompt}
            onScoringComplete={handleScoringComplete}
          />
        );
      
      case "results":
        console.log('Index: Rendering ScoreCompilation');
        if (!currentSession || currentSession.conversationScores.length === 0) {
          console.log('Index: No scoring results found for results view');
          return <div>No scoring results found</div>;
        }
        return (
          <ScoreCompilation
            conversationScores={currentSession.conversationScores}
            scoringMetrics={currentSession.testConfig.scoringMetrics}
            chatbotType={currentSession.testConfig.chatbotType}
            systemPrompt={currentSession.testConfig.systemPrompt}
            onBackToDashboard={() => {
              console.log('Index: onBackToDashboard callback triggered');
              setActiveViewWithDebug("dashboard");
            }}
          />
        );
      
      case "test-remote":
        console.log('Index: Rendering RemoteAgentTest');
        return <RemoteAgentTest />;
      
      default:
        console.log('Index: Default case - rendering Dashboard');
        return <Dashboard onStartTest={handleStartTest} onLoadSession={handleLoadSession} activeView={activeView} onViewChange={setActiveViewWithDebug} />;
    }
  };

  const getNavigationSteps = () => {
    const steps = [
      { key: "dashboard", label: "Dashboard", icon: "🏠" },
      { key: "configure", label: "Configure", icon: "⚙️" },
      { key: "simulation", label: "Simulate", icon: "💬" },
      { key: "viewer", label: "Review", icon: "👁️" },
      { key: "scoring", label: "Score", icon: "🎯" },
      { key: "results", label: "Results", icon: "📊" }
    ];

    return steps.map((step, index) => {
      const isActive = activeView === step.key;
      const isCompleted = currentSession && canNavigateTo(step.key);
      const isAccessible = currentSession && canNavigateTo(step.key);

      return (
        <div key={step.key} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            isActive 
              ? 'bg-primary text-primary-foreground' 
              : isCompleted 
                ? 'bg-green-500 text-white' 
                : 'bg-muted text-muted-foreground'
          }`}>
            {isCompleted ? '✓' : step.icon}
          </div>
          <span className={`ml-2 text-sm ${
            isActive ? 'text-primary font-medium' : 'text-muted-foreground'
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`ml-4 w-8 h-0.5 ${
              isCompleted ? 'bg-green-500' : 'bg-muted'
            }`} />
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-animated">
      <Header 
        activeView={activeView} 
        onViewChange={(view) => {
          console.log('Index: Header onViewChange called with view:', view);
          
          // Mark that user is manually navigating
          if (view === "dashboard") {
            setUserManuallyNavigated(true);
            console.log('Index: User manually navigating to dashboard via header, setting flag');
          } else if (activeView === "dashboard" && view !== "dashboard") {
            // User is leaving dashboard, reset the flag
            setUserManuallyNavigated(false);
            console.log('Index: User leaving dashboard via header, resetting manual navigation flag');
          }
          
          setActiveView(view);
        }} 
      />
      
      {/* Session Creation Prompt */}
      {showSessionPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Create New Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="session-name" className="text-sm font-medium">
                  Session Name
                </label>
                <input
                  id="session-name"
                  type="text"
                  placeholder="Enter a descriptive name..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                  className="w-full px-3 py-2 border rounded-md"
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
                    setShowSessionPrompt(false);
                    setNewSessionName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Navigation Steps */}
      {activeView !== "dashboard" && currentSession && (
        <div className="bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  console.log('Index: Navigation steps Back to Dashboard button clicked');
                  setActiveViewWithDebug("dashboard");
                }}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center space-x-4">
                {getNavigationSteps()}
              </div>
              
              <div className="w-20"></div> {/* Spacer for balance */}
            </div>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-6 py-8">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default Index;
