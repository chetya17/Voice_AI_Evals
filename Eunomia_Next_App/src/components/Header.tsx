import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Settings, 
  Download, 
  Play,
  BarChart3,
  MessageSquare,
  Eye,
  Gavel,
  FileText,
  User,
  LogOut
} from "lucide-react";
import { useDataPersistence } from "@/contexts/DataPersistenceContext";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Header = ({ activeView, onViewChange }: HeaderProps) => {
  const { currentSession, canNavigateTo, getSessionStatus } = useDataPersistence();
  const { user, logout } = useAuth();

  const getNavigationItems = () => {
    const items = [
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3, alwaysVisible: true },
      { key: 'configure', label: 'Configure', icon: Settings, alwaysVisible: false },
      { key: 'simulation', label: 'Simulate', icon: MessageSquare, alwaysVisible: false },
      { key: 'viewer', label: 'Review', icon: Eye, alwaysVisible: false },
      { key: 'scoring', label: 'Score', icon: Gavel, alwaysVisible: false },
      { key: 'results', label: 'Results', icon: Download, alwaysVisible: false }
      // Removed 'Test Review' - functionality is now in Dashboard with SessionDetailsModal
    ];

    return items.filter(item => item.alwaysVisible || (currentSession && canNavigateTo(item.key)));
  };

  const navigationItems = getNavigationItems();

  const handleViewChange = (view: string) => {
    console.log(`Header: handleViewChange called with view: ${view}`);
    console.log(`Header: Current activeView: ${activeView}`);
    console.log(`Header: Current session:`, currentSession);
    console.log(`Header: canNavigateTo(${view}):`, canNavigateTo(view));
    console.log(`Header: About to call onViewChange(${view})`);
    
    onViewChange(view);
    console.log(`Header: onViewChange(${view}) called`);
  };

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                NeuroTest
              </h1>
              <p className="text-sm text-muted-foreground">A GenAI Evals Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button 
                  key={item.key}
                  variant={activeView === item.key ? 'default' : 'ghost'}
                  onClick={() => handleViewChange(item.key)}
                  className="gap-2"
                  disabled={!item.alwaysVisible && !canNavigateTo(item.key)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Status Badge & User Info */}
          <div className="flex items-center gap-3">
            {currentSession && (
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                {currentSession.name}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {getSessionStatus()}
            </Badge>
            
            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-2">
                  <User className="h-3 w-3" />
                  {user.username}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;