import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { generateId } from '@/lib/mongodb';
import { generateGeminiResponse } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const { sessionId, testCaseCount = 5, documentIds } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

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

    // Get document chunks from memory (import the documentChunks Map)
    const { documentChunks } = await import('@/lib/mongodb');
    
    // Collect all chunks from all documents
    const allChunks: string[] = [];
    const documentMetadata: { [key: string]: any } = {};

    for (const doc of documents) {
      const chunks = documentChunks.get(doc.documentId);
      if (chunks && chunks.length > 0) {
        allChunks.push(...chunks.map((chunk: any) => chunk.content));
        documentMetadata[doc.documentId] = {
          fileName: doc.fileName,
          chunkCount: chunks.length
        };
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No document chunks found. Please ensure documents are processed.' 
      }, { status: 404 });
    }

    // Generate test cases based on document content
    const testCases = await generateDocumentBasedTestCases(allChunks, testCaseCount, documentMetadata);

    // Store generated test cases
    const testCasesCollection = db.collection('generated_test_cases');
    const testCaseData = {
      _id: new ObjectId(),
      testCaseId: generateId('rag_test'),
      userId,
      sessionId,
      source: 'document_based',
      testCases,
      documentCount: documents.length,
      totalChunks: allChunks.length,
      createdAt: new Date()
    };

    await testCasesCollection.insertOne(testCaseData);

    return NextResponse.json({
      success: true,
      data: {
        testCases,
        documentCount: documents.length,
        totalChunks: allChunks.length,
        testCaseId: testCaseData.testCaseId
      }
    });

  } catch (error) {
    console.error('Error generating document-based test cases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate test cases' },
      { status: 500 }
    );
  }
}

async function generateDocumentBasedTestCases(
  chunks: string[], 
  testCaseCount: number,
  documentMetadata: { [key: string]: any }
): Promise<string[]> {
  try {
    // Select diverse chunks for test case generation
    const selectedChunks = selectDiverseChunks(chunks, Math.min(testCaseCount * 2, chunks.length));
    
    const prompt = `You are an expert in RAG (Retrieval-Augmented Generation) evaluation. Generate ${testCaseCount} test questions based on the following document chunks.

Document chunks:
${selectedChunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk}\n`).join('\n')}

Requirements:
1. Generate exactly ${testCaseCount} test questions
2. Each question should be answerable from the provided document chunks
3. Create diverse question types:
   - Factual questions (what, when, where, who)
   - Analytical questions (how, why)
   - Comparative questions
   - Detail-oriented questions
4. Ensure questions test different aspects of the document content
5. Make questions realistic and relevant to the document content
6. Avoid questions that require external knowledge not in the chunks
7. Focus on questions that would test if an AI agent can accurately retrieve and use information from the provided context

Return only a JSON array of strings, no additional text or formatting.

Example format: ["Question 1", "Question 2", "Question 3"]`;

    const response = await generateGeminiResponse(prompt);
    
    // Parse the JSON response
    const testCases = JSON.parse(response);
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new Error('Invalid response format from AI');
    }

    return testCases.slice(0, testCaseCount);

  } catch (error) {
    console.error('Error generating test cases:', error);
    // Fallback: generate simple test cases based on chunk content
    return generateFallbackTestCases(chunks, testCaseCount);
  }
}

function selectDiverseChunks(chunks: string[], count: number): string[] {
  if (chunks.length <= count) {
    return chunks;
  }

  // Select chunks from different parts of the documents
  const step = Math.floor(chunks.length / count);
  const selected: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const index = Math.min(i * step, chunks.length - 1);
    selected.push(chunks[index]);
  }
  
  return selected;
}

function generateFallbackTestCases(chunks: string[], count: number): string[] {
  const testCases: string[] = [];
  
  for (let i = 0; i < Math.min(count, chunks.length); i++) {
    const chunk = chunks[i];
    const words = chunk.split(' ').slice(0, 10); // First 10 words
    testCases.push(`What information is provided about ${words.join(' ')}?`);
  }
  
  return testCases;
}



