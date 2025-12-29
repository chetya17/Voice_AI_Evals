import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateId } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate document ID
    const documentId = generateId('doc');

    // Store document metadata in MongoDB
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    const documentData = {
      _id: new ObjectId(),
      documentId,
      userId,
      sessionId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'uploaded',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await documentsCollection.insertOne(documentData);

    // Store file in MongoDB GridFS
    const bucket = new (await import('mongodb')).GridFSBucket(db, { bucketName: 'documents' });
    const uploadStream = bucket.openUploadStream(documentId, {
      metadata: {
        userId,
        sessionId,
        fileName: file.name,
        mimeType: file.type
      }
    });

    await new Promise((resolve, reject) => {
      uploadStream.write(buffer);
      uploadStream.end();
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        fileName: file.name,
        fileSize: file.size,
        status: 'uploaded'
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
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
    const sessionId = searchParams.get('sessionId');

    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    const query: any = { userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const documents = await documentsCollection.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
