import { getDatabase } from './mongodb';

/**
 * Database indexes for optimal performance
 * These indexes should be created when the application starts or during deployment
 */
export class DatabaseIndexService {
  /**
   * Create all recommended indexes for the application
   */
  static async createAllIndexes(): Promise<void> {
    try {
      console.log('Creating database indexes...');
      
      await Promise.all([
        this.createUserIndexes(),
        this.createSessionIndexes(),
        this.createTestConfigurationIndexes(),
        this.createConversationIndexes(),
        this.createScoreIndexes(),
        this.createContentIndexes(),
        this.createGuidelineIndexes(),
        this.createExportIndexes(),
        this.createWorkflowIndexes()
      ]);
      
      console.log('All database indexes created successfully');
    } catch (error) {
      console.error('Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for users collection
   */
  static async createUserIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('users');
    
    await Promise.all([
      // Unique email index
      collection.createIndex({ email: 1 }, { unique: true }),
      // Unique username index
      collection.createIndex({ username: 1 }, { unique: true }),
      // Active users index
      collection.createIndex({ isActive: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 })
    ]);
    
    console.log('User indexes created');
  }

  /**
   * Create indexes for sessions collection
   */
  static async createSessionIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('sessions');
    
    await Promise.all([
      // User sessions index
      collection.createIndex({ userId: 1 }),
      // Session status index
      collection.createIndex({ status: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + status queries
      collection.createIndex({ userId: 1, status: 1 }),
      // Compound index for user + created date
      collection.createIndex({ userId: 1, createdAt: -1 })
    ]);
    
    console.log('Session indexes created');
  }

  /**
   * Create indexes for test_configurations collection
   */
  static async createTestConfigurationIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('test_configurations');
    
    await Promise.all([
      // User configurations index
      collection.createIndex({ userId: 1 }),
      // Session configurations index
      collection.createIndex({ sessionId: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + session
      collection.createIndex({ userId: 1, sessionId: 1 }),
      // Chatbot type index for filtering
      collection.createIndex({ chatbotType: 1 }),
      // Agent type index for filtering
      collection.createIndex({ agentType: 1 })
    ]);
    
    console.log('Test configuration indexes created');
  }

  /**
   * Create indexes for simulated_conversations collection
   */
  static async createConversationIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('simulated_conversations');
    
    await Promise.all([
      // User conversations index
      collection.createIndex({ userId: 1 }),
      // Session conversations index
      collection.createIndex({ sessionId: 1 }),
      // Conversation ID index (for unique lookups)
      collection.createIndex({ conversationId: 1 }),
      // Completed status index
      collection.createIndex({ completed: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + session
      collection.createIndex({ userId: 1, sessionId: 1 }),
      // Compound index for session + completed status
      collection.createIndex({ sessionId: 1, completed: 1 }),
      // Test case index for filtering
      collection.createIndex({ testCase: 1 })
    ]);
    
    console.log('Conversation indexes created');
  }

  /**
   * Create indexes for conversation_scores collection
   */
  static async createScoreIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('conversation_scores');
    
    await Promise.all([
      // User scores index
      collection.createIndex({ userId: 1 }),
      // Session scores index
      collection.createIndex({ sessionId: 1 }),
      // Conversation scores index
      collection.createIndex({ conversationId: 1 }),
      // Average score index for sorting
      collection.createIndex({ averageScore: -1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + session
      collection.createIndex({ userId: 1, sessionId: 1 }),
      // Compound index for session + average score
      collection.createIndex({ sessionId: 1, averageScore: -1 }),
      // Test case index for filtering
      collection.createIndex({ testCase: 1 })
    ]);
    
    console.log('Score indexes created');
  }

  /**
   * Create indexes for generated_content collection
   */
  static async createContentIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('generated_content');
    
    await Promise.all([
      // User content index
      collection.createIndex({ userId: 1 }),
      // Session content index
      collection.createIndex({ sessionId: 1 }),
      // Content type index
      collection.createIndex({ contentType: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + session
      collection.createIndex({ userId: 1, sessionId: 1 }),
      // Compound index for user + content type
      collection.createIndex({ userId: 1, contentType: 1 }),
      // Compound index for session + content type
      collection.createIndex({ sessionId: 1, contentType: 1 })
    ]);
    
    console.log('Content indexes created');
  }

  /**
   * Create indexes for guidelines collection
   */
  static async createGuidelineIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('guidelines');
    
    await Promise.all([
      // User guidelines index
      collection.createIndex({ userId: 1 }),
      // Session guidelines index
      collection.createIndex({ sessionId: 1 }),
      // Guideline type index
      collection.createIndex({ type: 1 }),
      // Active guidelines index
      collection.createIndex({ isActive: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Compound index for user + type
      collection.createIndex({ userId: 1, type: 1 }),
      // Compound index for user + active status
      collection.createIndex({ userId: 1, isActive: 1 }),
      // Compound index for type + active status
      collection.createIndex({ type: 1, isActive: 1 })
    ]);
    
    console.log('Guideline indexes created');
  }

  /**
   * Create indexes for exported_results collection
   */
  static async createExportIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('exported_results');
    
    await Promise.all([
      // User exports index
      collection.createIndex({ userId: 1 }),
      // Session exports index
      collection.createIndex({ sessionId: 1 }),
      // Export type index
      collection.createIndex({ exportType: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Compound index for user + session
      collection.createIndex({ userId: 1, sessionId: 1 }),
      // Compound index for user + export type
      collection.createIndex({ userId: 1, exportType: 1 })
    ]);
    
    console.log('Export indexes created');
  }

  /**
   * Create indexes for evaluation_workflows collection
   */
  static async createWorkflowIndexes(): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection('evaluation_workflows');
    
    await Promise.all([
      // User workflows index
      collection.createIndex({ userId: 1 }),
      // Workflow status index
      collection.createIndex({ status: 1 }),
      // Created date index for sorting
      collection.createIndex({ createdAt: -1 }),
      // Updated date index for sorting
      collection.createIndex({ updatedAt: -1 }),
      // Completed date index for sorting
      collection.createIndex({ completedAt: -1 }),
      // Compound index for user + status
      collection.createIndex({ userId: 1, status: 1 }),
      // Compound index for user + created date
      collection.createIndex({ userId: 1, createdAt: -1 })
    ]);
    
    console.log('Workflow indexes created');
  }

  /**
   * Drop all indexes (use with caution - for development only)
   */
  static async dropAllIndexes(): Promise<void> {
    try {
      console.log('Dropping all database indexes...');
      
      const db = await getDatabase();
      const collections = [
        'users', 'sessions', 'test_configurations', 'simulated_conversations',
        'conversation_scores', 'generated_content', 'guidelines', 
        'exported_results', 'evaluation_workflows'
      ];
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        await collection.dropIndexes();
        console.log(`Dropped indexes for ${collectionName}`);
      }
      
      console.log('All database indexes dropped');
    } catch (error) {
      console.error('Error dropping database indexes:', error);
      throw error;
    }
  }

  /**
   * Get index information for a collection
   */
  static async getIndexInfo(collectionName: string): Promise<any[]> {
    const db = await getDatabase();
    const collection = db.collection(collectionName);
    return await collection.indexes();
  }

  /**
   * Get index statistics for all collections
   */
  static async getIndexStats(): Promise<Record<string, any[]>> {
    const db = await getDatabase();
    const collections = [
      'users', 'sessions', 'test_configurations', 'simulated_conversations',
      'conversation_scores', 'generated_content', 'guidelines', 
      'exported_results', 'evaluation_workflows'
    ];
    
    const stats: Record<string, any[]> = {};
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        stats[collectionName] = await collection.indexes();
      } catch (error) {
        console.error(`Error getting index stats for ${collectionName}:`, error);
        stats[collectionName] = [];
      }
    }
    
    return stats;
  }
}
