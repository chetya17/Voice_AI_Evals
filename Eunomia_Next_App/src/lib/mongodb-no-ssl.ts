import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

// Clean the URI - remove all SSL parameters and let MongoDB handle it
let uri = process.env.MONGODB_URI;

// Remove SSL parameters that might be causing issues
uri = uri.replace(/[?&](ssl|tls|retryWrites|w)=[^&]*/g, '');
uri = uri.replace(/[?&]appName=[^&]*/g, '');

// Add only essential parameters
const separator = uri.includes('?') ? '&' : '?';
uri = `${uri}${separator}retryWrites=true&w=majority`;

console.log('Using cleaned MongoDB URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// Global variable to store the connection
let cached = (global as any).mongo;

if (!cached) {
  cached = (global as any).mongo = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Ultra-minimal options - let MongoDB handle everything
    const opts = {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    };

    cached.promise = MongoClient.connect(uri, opts).then((client) => {
      return {
        client,
        db: client.db('neurotest'),
      };
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
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
