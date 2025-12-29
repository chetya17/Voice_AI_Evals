import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const documentId = searchParams.get('documentId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // Get document chunks from memory
    const { documentChunks } = await import('@/lib/mongodb');
    
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    let chunks: any[] = [];

    if (documentId) {
      // Get chunks for specific document
      const documentChunksData = documentChunks.get(documentId);
      if (documentChunksData) {
        chunks = documentChunksData.slice(0, limit).map((chunk: any, index: number) => ({
          chunkId: `${documentId}_${index}`,
          content: chunk.content,
          documentId,
          chunkIndex: index
        }));
      }
    } else {
      // Get chunks for all documents in session
      const documents = await documentsCollection.find({
        sessionId,
        userId,
        status: 'processed'
      }).toArray();

      for (const doc of documents) {
        const documentChunksData = documentChunks.get(doc.documentId);
        if (documentChunksData) {
          const docChunks = documentChunksData.slice(0, Math.ceil(limit / documents.length)).map((chunk: any, index: number) => ({
            chunkId: `${doc.documentId}_${index}`,
            content: chunk.content,
            documentId: doc.documentId,
            fileName: doc.fileName,
            chunkIndex: index
          }));
          chunks.push(...docChunks);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        chunks: chunks.slice(0, limit),
        totalChunks: chunks.length
      }
    });

  } catch (error) {
    console.error('Error retrieving document chunks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve document chunks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { sessionId, query, limit = 5 } = await request.json();

    if (!sessionId || !query) {
      return NextResponse.json({ success: false, error: 'Session ID and query required' }, { status: 400 });
    }

    // Get document chunks from memory
    const { documentChunks } = await import('@/lib/mongodb');
    
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    // Get all processed documents for the session
    const documents = await documentsCollection.find({
      sessionId,
      userId,
      status: 'processed'
    }).toArray();

    if (documents.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No processed documents found for this session' 
      }, { status: 404 });
    }

    // Simple text-based search in chunks
    const allChunks: any[] = [];
    
    for (const doc of documents) {
      const documentChunksData = documentChunks.get(doc.documentId);
      if (documentChunksData) {
        const docChunks = documentChunksData.map((chunk: any, index: number) => ({
          chunkId: `${doc.documentId}_${index}`,
          content: chunk.content,
          documentId: doc.documentId,
          fileName: doc.fileName,
          chunkIndex: index,
          relevanceScore: calculateRelevanceScore(query, chunk.content)
        }));
        allChunks.push(...docChunks);
      }
    }

    // Sort by relevance and return top results
    const relevantChunks = allChunks
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(chunk => ({
        chunkId: chunk.chunkId,
        content: chunk.content,
        documentId: chunk.documentId,
        fileName: chunk.fileName,
        chunkIndex: chunk.chunkIndex,
        relevanceScore: chunk.relevanceScore
      }));

    return NextResponse.json({
      success: true,
      data: {
        chunks: relevantChunks,
        totalChunks: allChunks.length
      }
    });

  } catch (error) {
    console.error('Error searching document chunks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search document chunks' },
      { status: 500 }
    );
  }
}

function calculateRelevanceScore(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let score = 0;
  for (const word of queryWords) {
    if (contentWords.includes(word)) {
      score += 1;
    }
  }
  
  return score / queryWords.length;
}



