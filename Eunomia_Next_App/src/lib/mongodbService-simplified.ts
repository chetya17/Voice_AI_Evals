import { 
  getUsersCollection,
  getSessionsCollection,
  getTestCasesCollection,
  getScoringMetricsCollection,
  getConversationsCollection,
  getConversationScoresCollection,
  getGuidelinesCollection,
  MongoDBUser,
  MongoDBSession,
  MongoDBTestCase,
  MongoDBScoringMetric,
  MongoDBGuideline,
  MongoDBConversation,
  MongoDBConversationScore,
  MongoDBOverallScores,
  generateId
} from './mongodb-simplified';

// User Management Services
export class UserService {
  static async createUser(userData: Omit<MongoDBUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<MongoDBUser> {
    const collection = await getUsersCollection();
    const now = new Date();
    const user: MongoDBUser = {
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  static async getUserById(userId: string): Promise<MongoDBUser | null> {
    const collection = await getUsersCollection();
    return await collection.findOne({ _id: userId });
  }

  static async getUserByUsername(username: string): Promise<MongoDBUser | null> {
    const collection = await getUsersCollection();
    return await collection.findOne({ username });
  }

  static async updateUser(userId: string, updateData: Partial<MongoDBUser>): Promise<MongoDBUser | null> {
    const collection = await getUsersCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }
}

// Session Management Services
export class SessionService {
  static async createSession(sessionData: Omit<MongoDBSession, '_id' | 'createdAt' | 'updatedAt'>): Promise<MongoDBSession> {
    const collection = await getSessionsCollection();
    const now = new Date();
    const session: MongoDBSession = {
      ...sessionData,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(session);
    return { ...session, _id: result.insertedId.toString() };
  }

  static async getSessionById(sessionId: string): Promise<MongoDBSession | null> {
    const collection = await getSessionsCollection();
    return await collection.findOne({ _id: sessionId });
  }

  static async getSessionsByUserId(userId: string): Promise<MongoDBSession[]> {
    const collection = await getSessionsCollection();
    return await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  static async updateSession(sessionId: string, updateData: Partial<MongoDBSession>): Promise<MongoDBSession | null> {
    const collection = await getSessionsCollection();
    const result = await collection.findOneAndUpdate(
      { _id: sessionId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const collection = await getSessionsCollection();
    const result = await collection.deleteOne({ _id: sessionId });
    return result.deletedCount > 0;
  }
}

// Test Case Management Services
export class TestCaseService {
  static async createTestCase(testCaseData: Omit<MongoDBTestCase, '_id' | 'createdAt'>): Promise<MongoDBTestCase> {
    const collection = await getTestCasesCollection();
    const now = new Date();
    const testCase: MongoDBTestCase = {
      ...testCaseData,
      createdAt: now
    };
    const result = await collection.insertOne(testCase);
    return { ...testCase, _id: result.insertedId.toString() };
  }

  static async createMultipleTestCases(testCases: Omit<MongoDBTestCase, '_id' | 'createdAt'>[]): Promise<MongoDBTestCase[]> {
    const collection = await getTestCasesCollection();
    const now = new Date();
    const testCasesWithTimestamps = testCases.map(tc => ({
      ...tc,
      createdAt: now
    }));
    const result = await collection.insertMany(testCasesWithTimestamps);
    
    return testCasesWithTimestamps.map((tc, index) => ({
      ...tc,
      _id: result.insertedIds[index].toString()
    }));
  }

  static async getTestCasesBySessionId(sessionId: string): Promise<MongoDBTestCase[]> {
    const collection = await getTestCasesCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async getTestCasesByUserId(userId: string): Promise<MongoDBTestCase[]> {
    const collection = await getTestCasesCollection();
    return await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  static async deleteTestCasesBySessionId(sessionId: string): Promise<number> {
    const collection = await getTestCasesCollection();
    const result = await collection.deleteMany({ sessionId });
    return result.deletedCount;
  }
}

// Scoring Metrics Management Services
export class ScoringMetricService {
  static async createScoringMetric(metricData: Omit<MongoDBScoringMetric, '_id' | 'createdAt'>): Promise<MongoDBScoringMetric> {
    const collection = await getScoringMetricsCollection();
    const now = new Date();
    const metric: MongoDBScoringMetric = {
      ...metricData,
      createdAt: now
    };
    const result = await collection.insertOne(metric);
    return { ...metric, _id: result.insertedId.toString() };
  }

  static async createMultipleScoringMetrics(metrics: Omit<MongoDBScoringMetric, '_id' | 'createdAt'>[]): Promise<MongoDBScoringMetric[]> {
    const collection = await getScoringMetricsCollection();
    const now = new Date();
    const metricsWithTimestamps = metrics.map(m => ({
      ...m,
      createdAt: now
    }));
    const result = await collection.insertMany(metricsWithTimestamps);
    
    return metricsWithTimestamps.map((m, index) => ({
      ...m,
      _id: result.insertedIds[index].toString()
    }));
  }

  static async getScoringMetricsBySessionId(sessionId: string): Promise<MongoDBScoringMetric[]> {
    const collection = await getScoringMetricsCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async getScoringMetricsByUserId(userId: string): Promise<MongoDBScoringMetric[]> {
    const collection = await getScoringMetricsCollection();
    return await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  static async deleteScoringMetricsBySessionId(sessionId: string): Promise<number> {
    const collection = await getScoringMetricsCollection();
    const result = await collection.deleteMany({ sessionId });
    return result.deletedCount;
  }
}

// Guidelines Management Services
export class GuidelineService {
  static async createGuideline(guidelineData: Omit<MongoDBGuideline, '_id' | 'createdAt' | 'updatedAt'>): Promise<MongoDBGuideline> {
    const collection = await getGuidelinesCollection();
    const now = new Date();
    const guideline: MongoDBGuideline = {
      ...guidelineData,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(guideline);
    return { ...guideline, _id: result.insertedId.toString() };
  }

  static async createMultipleGuidelines(guidelines: Omit<MongoDBGuideline, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<MongoDBGuideline[]> {
    const collection = await getGuidelinesCollection();
    const now = new Date();
    const guidelinesWithTimestamps = guidelines.map(g => ({
      ...g,
      createdAt: now,
      updatedAt: now
    }));
    const result = await collection.insertMany(guidelinesWithTimestamps);
    
    return guidelinesWithTimestamps.map((g, index) => ({
      ...g,
      _id: result.insertedIds[index].toString()
    }));
  }

  static async getGuidelinesBySessionId(sessionId: string): Promise<MongoDBGuideline[]> {
    const collection = await getGuidelinesCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async updateGuideline(guidelineId: string, updateData: Partial<MongoDBGuideline>): Promise<MongoDBGuideline | null> {
    const collection = await getGuidelinesCollection();
    const result = await collection.findOneAndUpdate(
      { guidelineId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  static async deleteGuidelinesBySessionId(sessionId: string): Promise<number> {
    const collection = await getGuidelinesCollection();
    const result = await collection.deleteMany({ sessionId });
    return result.deletedCount;
  }
}

// Conversation Management Services
export class ConversationService {
  static async createConversation(conversationData: Omit<MongoDBConversation, '_id' | 'createdAt' | 'updatedAt'>): Promise<MongoDBConversation> {
    const collection = await getConversationsCollection();
    const now = new Date();
    const conversation: MongoDBConversation = {
      ...conversationData,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(conversation);
    return { ...conversation, _id: result.insertedId.toString() };
  }

  static async createMultipleConversations(conversations: Omit<MongoDBConversation, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<MongoDBConversation[]> {
    const collection = await getConversationsCollection();
    const now = new Date();
    const conversationsWithTimestamps = conversations.map(c => ({
      ...c,
      createdAt: now,
      updatedAt: now
    }));
    const result = await collection.insertMany(conversationsWithTimestamps);
    
    return conversationsWithTimestamps.map((c, index) => ({
      ...c,
      _id: result.insertedIds[index].toString()
    }));
  }

  static async getConversationsBySessionId(sessionId: string): Promise<MongoDBConversation[]> {
    const collection = await getConversationsCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async getConversationById(conversationId: string): Promise<MongoDBConversation | null> {
    const collection = await getConversationsCollection();
    return await collection.findOne({ conversationId });
  }

  static async updateConversation(conversationId: string, updateData: Partial<MongoDBConversation>): Promise<MongoDBConversation | null> {
    const collection = await getConversationsCollection();
    const result = await collection.findOneAndUpdate(
      { conversationId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  static async deleteConversationsBySessionId(sessionId: string): Promise<number> {
    const collection = await getConversationsCollection();
    const result = await collection.deleteMany({ sessionId });
    return result.deletedCount;
  }
}

// Conversation Scores Management Services
export class ConversationScoreService {
  static async createConversationScore(scoreData: Omit<MongoDBConversationScore, '_id' | 'createdAt'>): Promise<MongoDBConversationScore> {
    const collection = await getConversationScoresCollection();
    const now = new Date();
    const score: MongoDBConversationScore = {
      ...scoreData,
      createdAt: now
    };
    const result = await collection.insertOne(score);
    return { ...score, _id: result.insertedId.toString() };
  }

  static async createMultipleConversationScores(scores: Omit<MongoDBConversationScore, '_id' | 'createdAt'>[]): Promise<MongoDBConversationScore[]> {
    const collection = await getConversationScoresCollection();
    const now = new Date();
    const scoresWithTimestamps = scores.map(s => ({
      ...s,
      createdAt: now
    }));
    const result = await collection.insertMany(scoresWithTimestamps);
    
    return scoresWithTimestamps.map((s, index) => ({
      ...s,
      _id: result.insertedIds[index].toString()
    }));
  }

  static async getConversationScoresBySessionId(sessionId: string): Promise<MongoDBConversationScore[]> {
    const collection = await getConversationScoresCollection();
    return await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async getConversationScoreById(conversationId: string): Promise<MongoDBConversationScore | null> {
    const collection = await getConversationScoresCollection();
    return await collection.findOne({ conversationId });
  }

  static async deleteConversationScoresBySessionId(sessionId: string): Promise<number> {
    const collection = await getConversationScoresCollection();
    const result = await collection.deleteMany({ sessionId });
    return result.deletedCount;
  }
}

// Overall Scores Management Services
export class OverallScoresService {
  static async createOverallScores(scoresData: Omit<MongoDBOverallScores, '_id' | 'createdAt'>): Promise<MongoDBOverallScores> {
    const collection = await getConversationScoresCollection(); // Reuse collection
    const now = new Date();
    const scores: MongoDBOverallScores = {
      ...scoresData,
      createdAt: now
    };
    const result = await collection.insertOne(scores);
    return { ...scores, _id: result.insertedId.toString() };
  }

  static async getOverallScoresBySessionId(sessionId: string): Promise<MongoDBOverallScores | null> {
    const collection = await getConversationScoresCollection();
    return await collection.findOne({ sessionId, sessionOverallScore: { $exists: true } });
  }

  static async updateOverallScores(sessionId: string, updateData: Partial<MongoDBOverallScores>): Promise<MongoDBOverallScores | null> {
    const collection = await getConversationScoresCollection();
    const result = await collection.findOneAndUpdate(
      { sessionId, sessionOverallScore: { $exists: true } },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result;
  }
}

// Utility function to get complete session data
export async function getCompleteSessionData(sessionId: string): Promise<{
  session: MongoDBSession | null;
  testCases: MongoDBTestCase[];
  scoringMetrics: MongoDBScoringMetric[];
  guidelines: MongoDBGuideline[];
  conversations: MongoDBConversation[];
  conversationScores: MongoDBConversationScore[];
  overallScores: MongoDBOverallScores | null;
}> {
  const [
    session,
    testCases,
    scoringMetrics,
    guidelines,
    conversations,
    conversationScores,
    overallScores
  ] = await Promise.all([
    SessionService.getSessionById(sessionId),
    TestCaseService.getTestCasesBySessionId(sessionId),
    ScoringMetricService.getScoringMetricsBySessionId(sessionId),
    GuidelineService.getGuidelinesBySessionId(sessionId),
    ConversationService.getConversationsBySessionId(sessionId),
    ConversationScoreService.getConversationScoresBySessionId(sessionId),
    OverallScoresService.getOverallScoresBySessionId(sessionId)
  ]);

  return {
    session,
    testCases,
    scoringMetrics,
    guidelines,
    conversations,
    conversationScores,
    overallScores
  };
}

// Utility function to get all user data
export async function getUserCompleteData(userId: string): Promise<{
  user: MongoDBUser | null;
  sessions: MongoDBSession[];
  allTestCases: MongoDBTestCase[];
  allScoringMetrics: MongoDBScoringMetric[];
  allGuidelines: MongoDBGuideline[];
  allConversations: MongoDBConversation[];
  allConversationScores: MongoDBConversationScore[];
  allOverallScores: MongoDBOverallScores[];
}> {
  const [
    user,
    sessions,
    allTestCases,
    allScoringMetrics,
    allGuidelines,
    allConversations,
    allConversationScores,
    allOverallScores
  ] = await Promise.all([
    UserService.getUserById(userId),
    SessionService.getSessionsByUserId(userId),
    TestCaseService.getTestCasesByUserId(userId),
    ScoringMetricService.getScoringMetricsByUserId(userId),
    GuidelineService.getGuidelinesBySessionId(userId), // This needs to be updated to get by userId
    ConversationService.getConversationsBySessionId(userId), // This needs to be updated to get by userId
    ConversationScoreService.getConversationScoresBySessionId(userId), // This needs to be updated to get by userId
    OverallScoresService.getOverallScoresBySessionId(userId) // This needs to be updated to get by userId
  ]);

  return {
    user,
    sessions,
    allTestCases,
    allScoringMetrics,
    allGuidelines,
    allConversations,
    allConversationScores,
    allOverallScores: allOverallScores ? [allOverallScores] : []
  };
}
