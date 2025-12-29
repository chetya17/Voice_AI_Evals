import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;

// Optimized options for Vercel serverless environment
const options = {
  // SSL/TLS configuration for Vercel
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  tlsInsecure: false,
  
  // Connection settings
  retryWrites: true,
  w: 1 as const,
  maxPoolSize: 1, // Reduced for serverless
  minPoolSize: 0, // Allow connection pool to close
  maxIdleTimeMS: 10000, // Close connections after 10 seconds of inactivity
  
  // Timeout settings
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
  
  // Additional options for serverless
  directConnection: false,
  retryReads: true,
  readPreference: 'primary' as const,
  
  // Compression
  compressors: ['zlib'],
  
  // Buffer settings
  bufferCommands: false,
  bufferMaxEntries: 0,
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

// Helper function to safely close connections in serverless environment
export async function closeConnection() {
  try {
    const client = await clientPromise;
    await client.close();
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

// Helper function to check connection health
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db('admin').ping();
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return false;
  }
}
