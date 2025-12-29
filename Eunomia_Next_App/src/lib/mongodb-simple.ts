import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;

// Ultra-simple options for Vercel - let MongoDB handle everything
const options = {
  // Only essential options
  maxPoolSize: 1,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000,
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
  try {
    const client = await clientPromise;
    return client.db('neurotest');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Collection getters with error handling
export async function getUsersCollection() {
  try {
    const db = await getDatabase();
    return db.collection('users');
  } catch (error) {
    console.error('Error getting users collection:', error);
    throw error;
  }
}

export async function getSessionsCollection() {
  try {
    const db = await getDatabase();
    return db.collection('sessions');
  } catch (error) {
    console.error('Error getting sessions collection:', error);
    throw error;
  }
}

export async function getTestCasesCollection() {
  try {
    const db = await getDatabase();
    return db.collection('test_cases');
  } catch (error) {
    console.error('Error getting test cases collection:', error);
    throw error;
  }
}

export async function getScoringMetricsCollection() {
  try {
    const db = await getDatabase();
    return db.collection('scoring_metrics');
  } catch (error) {
    console.error('Error getting scoring metrics collection:', error);
    throw error;
  }
}

export async function getConversationsCollection() {
  try {
    const db = await getDatabase();
    return db.collection('conversations');
  } catch (error) {
    console.error('Error getting conversations collection:', error);
    throw error;
  }
}

export async function getConversationScoresCollection() {
  try {
    const db = await getDatabase();
    return db.collection('conversation_scores');
  } catch (error) {
    console.error('Error getting conversation scores collection:', error);
    throw error;
  }
}

export async function getGuidelinesCollection() {
  try {
    const db = await getDatabase();
    return db.collection('guidelines');
  } catch (error) {
    console.error('Error getting guidelines collection:', error);
    throw error;
  }
}
