import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
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
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
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
  return db.collection('test_cases');
}

export async function getScoringMetricsCollection() {
  const db = await getDatabase();
  return db.collection('scoring_metrics');
}

export async function getConversationsCollection() {
  const db = await getDatabase();
  return db.collection('conversations');
}

export async function getConversationScoresCollection() {
  const db = await getDatabase();
  return db.collection('conversation_scores');
}

export async function getGuidelinesCollection() {
  const db = await getDatabase();
  return db.collection('guidelines');
}

// Simplified MongoDB Schema Types - Only essential data

export interface MongoDBUser {
  _id?: string;
  username: string; // Unique username/ID for each user
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBSession {
  _id?: string;
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
  _id?: string;
  userId: string;
  sessionId: string;
  testCaseId: string; // Unique identifier for each test case
  content: string; // The actual test case content
  source: 'generated' | 'user_created' | 'csv_uploaded'; // How the test case was created
  csvFileName?: string; // If uploaded from CSV, store the filename
  createdAt: Date;
}

export interface MongoDBScoringMetric {
  _id?: string;
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
  _id?: string;
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
  _id?: string;
  userId: string;
  sessionId: string;
  conversationId: string; // Unique identifier for each conversation
  testCaseId: string; // Reference to the test case
  messages: Array<{
    messageId: string; // Unique identifier for each message
    role: 'user_query' | 'remote_agent_response'; // Clear labels as requested
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBConversationScore {
  _id?: string;
  userId: string;
  sessionId: string;
  conversationId: string; // Reference to conversation
  testCaseId: string; // Reference to test case
  metricScores: Array<{
    metricId: string; // Reference to scoring metric
    metricName: string;
    score: number | null; // null if not applicable
    maxScore: number;
    feedback: string;
    isNotApplicable: boolean;
    timestamp: Date;
  }>;
  overallScore: number; // Overall score for this conversation
  createdAt: Date;
}

export interface MongoDBOverallScores {
  _id?: string;
  userId: string;
  sessionId: string;
  metricOverallScores: Array<{
    metricId: string;
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

// Helper function to generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
