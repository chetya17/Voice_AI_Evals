import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;

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
    const opts = {
      // Minimal options for Vercel
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
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
