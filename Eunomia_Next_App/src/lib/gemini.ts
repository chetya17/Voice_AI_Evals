import { GoogleGenerativeAI } from '@google/generative-ai';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-for-build');

// Get the generative model for text generation - using Gemini 2.5 Pro
export const getTextModel = () => genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

// Get the embedding model
export const getEmbeddingModel = () => genAI.getGenerativeModel({ model: 'text-embedding-004' });
