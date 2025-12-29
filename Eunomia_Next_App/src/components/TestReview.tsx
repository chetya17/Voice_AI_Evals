"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Calendar, 
  User, 
  BarChart3, 
  Download,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TestData {
  id: string;
  userEmail: string;
  sessionName: string;
  testConfig: any;
  simulatedConversations: any[];
  conversationScores: any[];
  createdAt: string;
}

const TestReview: React.FC = () => {
  const [tests, setTests] = useState<TestData[]>([]);
  const [filteredTests, setFilteredTests] = useState<TestData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tests?userEmail=${user?.email}`);
      if (response.ok) {
        const data = await response.json();
        setTests(data);
        setFilteredTests(data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tests.filter(test =>
        test.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTests(filtered);
    } else {
      setFilteredTests(tests);
    }
  }, [searchTerm, tests]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (test: TestData) => {
    if (test.conversationScores && test.conversationScores.length > 0) {
      return <Badge className="bg-green-500">Completed</Badge>;
    } else if (test.simulatedConversations && test.simulatedConversations.length > 0) {
      return <Badge className="bg-yellow-500">In Progress</Badge>;
    } else {
      return <Badge variant="outline">Configured</Badge>;
    }
  };

  const exportTest = (test: TestData) => {
    const dataStr = JSON.stringify(test, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${test.sessionName}-${test.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Review</h2>
          <p className="text-muted-foreground">
            Review and manage your saved test sessions
          </p>
        </div>
        <Button onClick={fetchTests} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tests by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tests found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'No tests match your search criteria.' : 'You haven\'t saved any tests yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => (
            <Card key={test.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{test.sessionName}</CardTitle>
                  {getStatusBadge(test)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {test.userEmail}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(test.createdAt)}
                  </div>
                  {test.simulatedConversations && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {test.simulatedConversations.length} conversations
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => exportTest(test)}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestReview;
