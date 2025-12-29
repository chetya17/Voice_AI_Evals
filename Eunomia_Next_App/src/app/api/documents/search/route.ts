import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEmbeddingModel } from '@/lib/gemini';

// In-memory storage for document chunks (shared with process route)
const documentChunks = new Map<string, { content: string; embedding: number[] }[]>();

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { query, sessionId, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query required' }, { status: 400 });
    }

    // Generate query embedding
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const model = getEmbeddingModel();
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // Get all chunks from in-memory storage
    let allChunks: { content: string; embedding: number[] }[] = [];
    
    if (sessionId) {
      // Get chunks for specific session
      for (const [docId, chunks] of documentChunks.entries()) {
        // You might want to add session filtering here if needed
        allChunks.push(...chunks);
      }
    } else {
      // Get all chunks
      for (const chunks of documentChunks.values()) {
        allChunks.push(...chunks);
      }
    }

    // Calculate similarities and sort
    const chunksWithSimilarity = allChunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    const relevantChunks = chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ embedding, ...chunk }) => chunk); // Remove embedding from response

    return NextResponse.json({
      success: true,
      data: {
        query,
        chunks: relevantChunks,
        totalChunks: allChunks.length
      }
    });

  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search documents' },
      { status: 500 }
    );
  }
}
