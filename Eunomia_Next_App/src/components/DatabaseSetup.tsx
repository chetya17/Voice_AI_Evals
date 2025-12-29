import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Play,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

const DatabaseSetup: React.FC = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'connectivity', name: 'Test MongoDB Connectivity', status: 'pending' },
    { id: 'indexes', name: 'Create Database Indexes', status: 'pending' },
    { id: 'migration', name: 'Check Data Migration', status: 'pending' },
    { id: 'dataflow', name: 'Test Complete Data Flow', status: 'pending' }
  ]);

  const updateStep = (stepId: string, status: SetupStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ));
  };

  const runConnectivityTest = async () => {
    updateStep('connectivity', 'running');
    try {
      const response = await fetch('/api/test-data-flow');
      const data = await response.json();
      
      if (data.success && data.data.connected) {
        updateStep('connectivity', 'completed', 'MongoDB connection successful');
      } else {
        updateStep('connectivity', 'failed', 'MongoDB connection failed');
      }
    } catch (error) {
      updateStep('connectivity', 'failed', 'Failed to test connectivity');
    }
  };

  const createIndexes = async () => {
    updateStep('indexes', 'running');
    try {
      const response = await fetch('/api/setup-database', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        updateStep('indexes', 'completed', 'Database indexes created successfully');
      } else {
        updateStep('indexes', 'failed', data.error || 'Failed to create indexes');
      }
    } catch (error) {
      updateStep('indexes', 'failed', 'Failed to create database indexes');
    }
  };

  const checkMigration = async () => {
    updateStep('migration', 'running');
    try {
      const response = await fetch('/api/migrate-data');
      const data = await response.json();
      
      if (data.success) {
        if (data.data.needsMigration) {
          updateStep('migration', 'pending', 'Data migration needed - use migration component');
        } else {
          updateStep('migration', 'completed', 'No migration needed');
        }
      } else {
        updateStep('migration', 'failed', 'Failed to check migration status');
      }
    } catch (error) {
      updateStep('migration', 'failed', 'Failed to check migration status');
    }
  };

  const runDataFlowTest = async () => {
    updateStep('dataflow', 'running');
    try {
      const response = await fetch('/api/test-data-flow', { method: 'POST' });
      const data = await response.json();
      
      if (data.success && data.data.result.success) {
        updateStep('dataflow', 'completed', 'Complete data flow test passed');
      } else {
        const errors = data.data.result.errors.join(', ');
        updateStep('dataflow', 'failed', `Data flow test failed: ${errors}`);
      }
    } catch (error) {
      updateStep('dataflow', 'failed', 'Failed to run data flow test');
    }
  };

  const runAllSteps = async () => {
    setIsRunning(true);
    
    try {
      // Step 1: Test connectivity
      await runConnectivityTest();
      
      // Step 2: Create indexes
      await createIndexes();
      
      // Step 3: Check migration
      await checkMigration();
      
      // Step 4: Test data flow
      await runDataFlowTest();
      
      toast({
        title: "Database Setup Complete",
        description: "All database setup steps have been completed",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "An error occurred during database setup",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: undefined })));
  };

  const getStepIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const allCompleted = steps.every(step => step.status === 'completed');
  const hasFailures = steps.some(step => step.status === 'failed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 text-blue-500 mr-2" />
          Database Setup & Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool helps you set up and test your MongoDB integration. Run all steps to ensure everything is working correctly.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStepIcon(step.status)}
                <div>
                  <p className="font-medium">{step.name}</p>
                  {step.message && (
                    <p className="text-sm text-gray-600">{step.message}</p>
                  )}
                </div>
              </div>
              {getStepBadge(step.status)}
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={runAllSteps}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Setup...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Steps
              </>
            )}
          </Button>
          
          <Button
            onClick={resetSteps}
            disabled={isRunning}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {allCompleted && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Setup Complete!</strong> All database setup steps have been completed successfully. 
              Your MongoDB integration is ready to use.
            </AlertDescription>
          </Alert>
        )}

        {hasFailures && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Setup Issues Detected!</strong> Some steps failed. Please check the error messages above and try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>What this setup does:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Tests MongoDB connectivity</li>
            <li>Creates database indexes for optimal performance</li>
            <li>Checks if data migration is needed</li>
            <li>Runs a complete data flow test to verify everything works</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;
