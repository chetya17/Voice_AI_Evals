import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;

// Log connection string (without credentials) for debugging
const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
console.log('MongoDB URI (masked):', maskedUri);

const options = {
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  retryWrites: true,
  w: 1 as const,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
    _mongoUri?: string; // Track URI to detect changes
  };

  // Clear cached connection if URI changed
  if (globalWithMongo._mongoUri && globalWithMongo._mongoUri !== uri) {
    console.log('MongoDB URI changed, clearing cached connection');
    if (globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise.then(client => client.close()).catch(() => {});
    }
    globalWithMongo._mongoClientPromise = undefined;
  }

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoUri = uri;
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      console.error('MongoDB connection error:', error.message);
      if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
        console.error('Authentication failed. Please check:');
        console.error('1. Username and password in MONGODB_URI are correct');
        console.error('2. Special characters in password are URL-encoded (e.g., @ → %40, # → %23)');
        console.error('3. Database user exists and is active in MongoDB Atlas');
        console.error('4. Your IP address is whitelisted in Network Access');
      }
      throw error;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((error) => {
    console.error('MongoDB connection error:', error.message);
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('Authentication failed. Please check your MongoDB credentials.');
    }
    throw error;
  });
}

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('neurotest');
}

// Collection getters
export async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection('users');
}

export async function getSessionsCollection() {
  const db = await getDatabase();
  return db.collection('sessions');
}

export async function getTestCasesCollection() {
  const db = await getDatabase();
  return db.collection('test_configurations');
}

export async function getScoringMetricsCollection() {
  const db = await getDatabase();
  return db.collection('test_configurations');
}

export async function getConversationsCollection() {
  const db = await getDatabase();
  return db.collection('simulated_conversations');
}

export async function getConversationScoresCollection() {
  const db = await getDatabase();
  return db.collection('conversation_scores');
}

export async function getGuidelinesCollection() {
  const db = await getDatabase();
  return db.collection('guidelines');
}

export async function getTestConfigurationsCollection() {
  const db = await getDatabase();
  return db.collection('test_configurations');
}

export async function getSimulatedConversationsCollection() {
  const db = await getDatabase();
  return db.collection('simulated_conversations');
}

export async function getGeneratedContentCollection() {
  const db = await getDatabase();
  return db.collection('generated_content');
}

export async function getExportedResultsCollection() {
  const db = await getDatabase();
  return db.collection('exported_results');
}

export async function getEvaluationWorkflowsCollection() {
  const db = await getDatabase();
  return db.collection('evaluation_workflows');
}

export async function getDocumentsCollection() {
  const db = await getDatabase();
  return db.collection('documents');
}

// Document chunks are now stored in memory, no database collection needed

export async function getRAGEvaluationsCollection() {
  const db = await getDatabase();
  return db.collection('rag_evaluations');
}

// Simplified MongoDB Schema Types - Only essential data

export interface MongoDBUser {
  _id?: ObjectId;
  username: string; // Unique username/ID for each user
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBSession {
  _id?: ObjectId;
  userId: string; // Reference to user
  sessionId: string; // Unique session identifier
  name: string; // Session name entered by user
  agentDescription: string; // Agent description entered by user
  status: 'configured' | 'simulated' | 'scored' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface MongoDBTestCase {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  testCaseId: string; // Unique identifier for each test case
  content: string; // The actual test case content
  source: 'generated' | 'user_created' | 'csv_uploaded'; // How the test case was created
  csvFileName?: string; // If uploaded from CSV, store the filename
  createdAt: Date;
}

export interface MongoDBTestConfiguration {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  chatbotType: string;
  systemPrompt: string;
  testCases: number;
  conversationTurns: number;
  conversationMode?: 'fixed' | 'range' | 'auto';
  conversationRange?: { min: number; max: number };
  customMetrics: string[];
  scoringMetrics: Array<{
    name: string;
    description: string;
    totalPoints: number;
    rubrics: Array<{
      criterion: string;
      points: number;
      description: string;
    }>;
  }>;
  generatedTestCases: string[];
  uploadedTestCases?: string[];
  csvFileName?: string;
  useUploadedTestCases?: boolean;
  chatbotMode: 'endpoint';
  endpointUrl: string;
  endpointApiKey?: string;
  isEndpointValid?: boolean;
  useCorsProxy?: boolean;
  authorizationToken?: string;
  extractedHeaders?: Record<string, string>;
  extractedCookies?: Record<string, string>;
  agentType?: string;
  guidelines?: {
    testCaseGuideline: string;
    scoringGuideline: string;
    simulationGuideline: string;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBScoringMetric {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  metricId: string; // Unique identifier for each metric
  name: string;
  description: string;
  totalPoints: number;
  rubrics: Array<{
    criterion: string;
    points: number;
    description: string;
  }>;
  source: 'generated' | 'user_added'; // How the metric was created
  createdAt: Date;
}

export interface MongoDBGuideline {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  guidelineId: string; // Unique identifier for each guideline
  type: 'test_case' | 'scoring' | 'simulation';
  content: string; // The guideline content
  isEdited: boolean; // Whether user edited the generated guideline
  originalContent?: string; // Store original if edited
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBConversation {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  conversationId: string; // Unique identifier for each conversation
  testCase: string; // The test case content
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBConversationScore {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  conversationId: string; // Reference to conversation
  testCase: string; // The test case content
  metricScores: Array<{
    metricName: string;
    score: number | null; // null if not applicable
    maxScore: number;
    feedback: string;
    isNotApplicable: boolean;
    timestamp: Date;
  }>;
  averageScore: number; // Average score for this conversation
  createdAt: Date;
}

export interface MongoDBOverallScores {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  metricOverallScores: Array<{
    metricName: string;
    averageScore: number;
    totalConversations: number;
    notApplicableCount: number;
    minScore: number;
    maxScore: number;
    standardDeviation: number;
  }>;
  sessionOverallScore: number; // Overall score for entire session
  totalConversations: number;
  totalMetrics: number;
  createdAt: Date;
}

export interface MongoDBDocument {
  _id?: ObjectId;
  documentId: string;
  userId: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  textLength?: number;
  chunkCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Document chunks are now stored in memory, no database schema needed

export interface MongoDBRAGEvaluation {
  _id?: ObjectId;
  evaluationId: string;
  userId: string;
  sessionId?: string;
  testCaseId?: string;
  question: string;
  answer: string;
  contexts: string[];
  groundTruth?: string;
  metrics: Array<{
    name: string;
    description: string;
    category: string;
    weight: number;
  }>;
  scores: {
    [metricName: string]: {
      metricName: string;
      score: number;
      explanation: string;
      details?: any;
    };
    overallScore: number;
  };
  createdAt: Date;
}

// Helper function to generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}