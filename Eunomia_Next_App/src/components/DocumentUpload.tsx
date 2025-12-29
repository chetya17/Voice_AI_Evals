import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  documentId: string;
  fileName: string;
  fileSize: number;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  textLength?: number;
  chunkCount?: number;
  createdAt: string;
}

interface DocumentUploadProps {
  sessionId: string;
  onDocumentsChange?: (documents: Document[]) => void;
}

const DocumentUpload = ({ sessionId, onDocumentsChange }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('user-id') || 'unknown'
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const newDocument: Document = {
          documentId: result.data.documentId,
          fileName: result.data.fileName,
          fileSize: result.data.fileSize,
          status: 'uploaded',
          createdAt: new Date().toISOString()
        };

        setDocuments(prev => [newDocument, ...prev]);
        onDocumentsChange?.([newDocument, ...documents]);

        toast({
          title: 'Document uploaded',
          description: `${file.name} has been uploaded successfully.`
        });

        // Start processing
        await processDocument(result.data.documentId);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const processDocument = async (documentId: string) => {
    setProcessing(documentId);

    try {
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('user-id') || 'unknown'
        },
        body: JSON.stringify({ documentId })
      });

      const result = await response.json();

      if (result.success) {
        setDocuments(prev => 
          prev.map(doc => 
            doc.documentId === documentId 
              ? { 
                  ...doc, 
                  status: 'processed',
                  textLength: result.data.textLength,
                  chunkCount: result.data.chunkCount
                }
              : doc
          )
        );

        toast({
          title: 'Document processed',
          description: `Document has been processed and is ready for RAG evaluation.`
        });
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setDocuments(prev => 
        prev.map(doc => 
          doc.documentId === documentId 
            ? { ...doc, status: 'error' }
            : doc
        )
      );

      toast({
        title: 'Processing failed',
        description: 'Failed to process document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(null);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      // TODO: Implement delete API
      setDocuments(prev => prev.filter(doc => doc.documentId !== documentId));
      onDocumentsChange?.(documents.filter(doc => doc.documentId !== documentId));
      
      toast({
        title: 'Document deleted',
        description: 'Document has been removed.'
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document.',
        variant: 'destructive'
      });
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/documents/upload?sessionId=${sessionId}`, {
        headers: {
          'x-user-id': localStorage.getItem('user-id') || 'unknown'
        }
      });

      const result = await response.json();

      if (result.success) {
        setDocuments(result.data);
        onDocumentsChange?.(result.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
          
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Click to upload PDF documents
              </p>
              <p className="text-xs text-gray-500">
                Max file size: 10MB
              </p>
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents</h4>
            {documents.map((doc) => (
              <div
                key={doc.documentId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <p className="text-sm font-medium">{doc.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)}
                      {doc.textLength && ` • ${doc.textLength.toLocaleString()} chars`}
                      {doc.chunkCount && ` • ${doc.chunkCount} chunks`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                  
                  {doc.status === 'processed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement view document
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(doc.documentId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load Documents Button */}
        <Button
          variant="outline"
          onClick={loadDocuments}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Load Existing Documents
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
