import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateId } from '@/lib/mongodb';
import { getEmbeddingModel } from '@/lib/gemini';

// In-memory storage for document chunks (per session)
const documentChunks = new Map<string, { content: string; embedding: number[] }[]>();

// PDF processing function
async function processPDF(buffer: Buffer): Promise<{ text: string; chunks: string[] }> {
  try {
    // Dynamic import to avoid issues with server-side rendering
    const pdf = await import('pdf-parse');
    const data = await pdf.default(buffer);
    
    const text = data.text;
    
    // Simple chunking strategy - split by paragraphs and sentences
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks: string[] = [];
    
    for (const paragraph of paragraphs) {
      if (paragraph.length <= 1000) {
        chunks.push(paragraph.trim());
      } else {
        // Split long paragraphs by sentences
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= 1000) {
            currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
          } else {
            if (currentChunk) {
              chunks.push(currentChunk + '.');
              currentChunk = sentence.trim();
            }
          }
        }
        
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
      }
    }
    
    return { text, chunks };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error('Failed to process PDF');
  }
}

// Generate embeddings using Gemini
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const model = getEmbeddingModel();
  
  try {
    const embeddings: number[][] = [];
    
    // Process texts in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += 10) {
      const batch = texts.slice(i, i + 10);
      const batchPromises = batch.map(async (text) => {
        const result = await model.embedContent(text);
        return result.embedding.values;
      });
      
      const batchEmbeddings = await Promise.all(batchPromises);
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Document ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    const chunksCollection = db.collection('document_chunks');

    // Get document metadata
    const document = await documentsCollection.findOne({ documentId, userId });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Get file from GridFS
    const bucket = new (await import('mongodb')).GridFSBucket(db, { bucketName: 'documents' });
    const downloadStream = bucket.openDownloadStreamByName(documentId);
    
    const chunks: Buffer[] = [];
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
      downloadStream.on('error', reject);
    });

    // Process PDF
    const { text, chunks: textChunks } = await processPDF(buffer);

    // Generate embeddings for chunks
    const embeddings = await generateEmbeddings(textChunks);

    // Store chunks in memory (not database)
    const chunksWithEmbeddings = textChunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index]
    }));

    documentChunks.set(documentId, chunksWithEmbeddings);

    // Update document status
    await documentsCollection.updateOne(
      { documentId, userId },
      { 
        $set: { 
          status: 'processed',
          textLength: text.length,
          chunkCount: textChunks.length,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        textLength: text.length,
        chunkCount: textChunks.length,
        status: 'processed'
      }
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Document ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    const chunksCollection = db.collection('document_chunks');

    const chunks = await chunksCollection
      .find({ documentId, userId })
      .sort({ chunkIndex: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: chunks
    });

  } catch (error) {
    console.error('Error fetching document chunks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document chunks' },
      { status: 500 }
    );
  }
}
