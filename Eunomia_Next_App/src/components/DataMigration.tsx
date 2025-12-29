import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MigrationStatus {
  needsMigration: boolean;
  message: string;
}

interface MigrationResult {
  success: boolean;
  migratedSessions: number;
  failedSessions: string[];
  localStorageCleared: boolean;
}

const DataMigration: React.FC = () => {
  const { toast } = useToast();
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [clearLocalStorage, setClearLocalStorage] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Check migration status on component mount
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate-data');
      const data = await response.json();
      
      if (data.success) {
        setMigrationStatus(data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to check migration status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      toast({
        title: "Error",
        description: "Failed to check migration status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performMigration = async () => {
    setIsMigrating(true);
    try {
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearLocalStorage
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMigrationResult(data.data);
        
        if (data.data.success) {
          toast({
            title: "Migration Successful",
            description: `Successfully migrated ${data.data.migratedSessions} sessions to MongoDB`,
            variant: "default",
          });
          
          // Refresh migration status
          await checkMigrationStatus();
        } else {
          toast({
            title: "Migration Completed with Errors",
            description: `Migrated ${data.data.migratedSessions} sessions, ${data.data.failedSessions.length} failed`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Migration Failed",
          description: data.error || "Failed to migrate data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during migration:', error);
      toast({
        title: "Migration Failed",
        description: "An error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking migration status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!migrationStatus?.needsMigration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Data Migration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {migrationStatus?.message || "No migration needed. Your data is already stored in MongoDB."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 text-blue-500 mr-2" />
          Data Migration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            We found data stored in your browser's localStorage that needs to be migrated to MongoDB for better persistence and security.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="clear-localStorage"
              checked={clearLocalStorage}
              onCheckedChange={(checked) => setClearLocalStorage(checked as boolean)}
            />
            <label
              htmlFor="clear-localStorage"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Clear localStorage data after successful migration
            </label>
          </div>

          <Button
            onClick={performMigration}
            disabled={isMigrating}
            className="w-full"
          >
            {isMigrating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Migrating Data...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Migrate to MongoDB
              </>
            )}
          </Button>
        </div>

        {migrationResult && (
          <div className="mt-4 space-y-2">
            <Alert className={migrationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {migrationResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={migrationResult.success ? "text-green-800" : "text-red-800"}>
                <div className="space-y-1">
                  <p>
                    <strong>Migration Result:</strong> {migrationResult.success ? 'Success' : 'Completed with errors'}
                  </p>
                  <p>Sessions migrated: {migrationResult.migratedSessions}</p>
                  {migrationResult.failedSessions.length > 0 && (
                    <p>Failed sessions: {migrationResult.failedSessions.join(', ')}</p>
                  )}
                  <p>LocalStorage cleared: {migrationResult.localStorageCleared ? 'Yes' : 'No'}</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>What happens during migration:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>All evaluation sessions will be copied to MongoDB</li>
            <li>Test configurations, conversations, and scores will be preserved</li>
            <li>Data will be associated with your user account</li>
            <li>Original localStorage data will be kept unless you choose to clear it</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataMigration;
