// Streaming Data Preprocessor for handling Server-Sent Events (SSE) from remote agents
// This module processes raw streaming chunks and assembles them into coherent messages

export interface StreamingChunk {
  success: boolean;
  message?: string;
  is_final?: boolean;
  isFinal?: boolean;
  close?: boolean;
  suggestions?: string[];
  isSuggestions?: boolean;
  is_suggestions?: boolean;
  id?: string;
  chat_thread_id?: string;
  chatThreadId?: string;
  sender?: {
    id: string;
    type: string;
  };
  timestamp?: string;
  metadata?: Record<string, any>;
  reply_to?: Record<string, any>;
  replyTo?: Record<string, any>;
  bot_response_failed?: boolean;
  botResponseFailed?: boolean;
  creator_action_status?: string;
  creatorActionStatus?: string;
  actions?: {
    liked: boolean;
    disliked: boolean;
  };
  attributes?: {
    intent: string;
    language: string;
  };
  citations?: Array<{
    id: string;
    url: string | null;
    title: string;
    content_id?: string | null;
    contentId?: string | null;
    type: string;
    subtype: string;
    text: string;
  }>;
  cards?: any[];
  response_id?: string | null;
  responseId?: string | null;
  thread?: {
    id: string;
    name: string;
    status: string;
    timestamps: {
      initiated: string;
      last_updated?: string;
      lastUpdated?: string;
    };
    modality: string;
    avatar_name?: string;
    avatarName?: string;
    learner_name?: string | null;
    learnerName?: string | null;
  };
}

export interface ProcessedMessage {
  id: string;
  content: string;
  timestamp: Date;
  metadata: {
    suggestions?: string[];
    citations?: Array<{
      id: string;
      url: string | null;
      title: string;
      contentId: string | null;
      type: string;
      subtype: string;
      text: string;
    }>;
    thread?: {
      id: string;
      name: string;
      status: string;
      timestamps: {
        initiated: string;
        lastUpdated: string;
      };
      modality: string;
      avatarName: string;
      learnerName: string | null;
    };
    originalChunks?: StreamingChunk[];
  };
}

export class StreamingDataPreprocessor {
  private messageBuffer: string = '';
  private currentMessageId: string | null = null;
  private currentTimestamp: Date | null = null;
  private currentMetadata: any = {};
  private chunks: StreamingChunk[] = [];

  /**
   * Process a streaming chunk and return a processed message if complete
   */
  processChunk(chunk: StreamingChunk): ProcessedMessage | null {
    // Add chunk to our collection for metadata
    this.chunks.push(chunk);

    // Extract message content
    if (chunk.message) {
      this.messageBuffer += chunk.message;
    }

    // Extract metadata from the chunk
    this.extractMetadata(chunk);

    // Check if this is the final chunk
    const isFinal = chunk.is_final || chunk.isFinal || chunk.close || false;

    if (isFinal) {
      // Process and return the complete message
      const processedMessage = this.createProcessedMessage();
      this.resetBuffer();
      return processedMessage;
    }

    return null;
  }

  /**
   * Extract metadata from a chunk
   */
  private extractMetadata(chunk: StreamingChunk): void {
    // Extract message ID
    if (chunk.id && !this.currentMessageId) {
      this.currentMessageId = chunk.id;
    }

    // Extract timestamp
    if (chunk.timestamp && !this.currentTimestamp) {
      this.currentTimestamp = new Date(chunk.timestamp);
    }

    // Extract suggestions
    if (chunk.suggestions && chunk.suggestions.length > 0) {
      this.currentMetadata.suggestions = chunk.suggestions;
    }

    // Extract citations
    if (chunk.citations && chunk.citations.length > 0) {
      this.currentMetadata.citations = chunk.citations.map(citation => ({
        id: citation.id,
        url: citation.url,
        title: citation.title,
        contentId: citation.content_id || citation.contentId || null,
        type: citation.type,
        subtype: citation.subtype,
        text: citation.text
      }));
    }

    // Extract thread information
    if (chunk.thread) {
      this.currentMetadata.thread = {
        id: chunk.thread.id,
        name: chunk.thread.name,
        status: chunk.thread.status,
        timestamps: {
          initiated: chunk.thread.timestamps.initiated,
          lastUpdated: chunk.thread.timestamps.last_updated || chunk.thread.timestamps.lastUpdated || chunk.thread.timestamps.initiated
        },
        modality: chunk.thread.modality,
        avatarName: chunk.thread.avatar_name || chunk.thread.avatarName || 'Unknown',
        learnerName: chunk.thread.learner_name || chunk.thread.learnerName || null
      };
    }

    // Extract other metadata
    if (chunk.metadata) {
      this.currentMetadata = { ...this.currentMetadata, ...chunk.metadata };
    }
  }

  /**
   * Create a processed message from the current buffer
   */
  private createProcessedMessage(): ProcessedMessage {
    const messageId = this.currentMessageId || this.generateMessageId();
    const timestamp = this.currentTimestamp || new Date();
    
    // Clean up the message content
    const cleanedContent = this.cleanMessageContent(this.messageBuffer);

    return {
      id: messageId,
      content: cleanedContent,
      timestamp,
      metadata: {
        ...this.currentMetadata,
        originalChunks: [...this.chunks] // Keep reference to original chunks for debugging
      }
    };
  }

  /**
   * Clean up message content by removing artifacts and normalizing
   */
  private cleanMessageContent(content: string): string {
    if (!content) return '';

    let cleaned = content;

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Remove trailing/leading whitespace
    cleaned = cleaned.trim();

    // Fix common formatting issues
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks
    cleaned = cleaned.replace(/\s+([.!?])/g, '$1'); // Remove spaces before punctuation
    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2'); // Ensure space after sentence endings

    // Handle markdown formatting
    cleaned = cleaned.replace(/\*\*\s+/g, '**'); // Remove spaces after **
    cleaned = cleaned.replace(/\s+\*\*/g, '**'); // Remove spaces before **

    return cleaned;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset the buffer for the next message
   */
  private resetBuffer(): void {
    this.messageBuffer = '';
    this.currentMessageId = null;
    this.currentTimestamp = null;
    this.currentMetadata = {};
    this.chunks = [];
  }

  /**
   * Get the current buffer state (useful for debugging)
   */
  getBufferState(): {
    messageBuffer: string;
    currentMessageId: string | null;
    currentTimestamp: Date | null;
    chunksCount: number;
  } {
    return {
      messageBuffer: this.messageBuffer,
      currentMessageId: this.currentMessageId,
      currentTimestamp: this.currentTimestamp,
      chunksCount: this.chunks.length
    };
  }

  /**
   * Process multiple chunks at once (useful for batch processing)
   */
  processChunks(chunks: StreamingChunk[]): ProcessedMessage[] {
    const messages: ProcessedMessage[] = [];
    
    for (const chunk of chunks) {
      const message = this.processChunk(chunk);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Parse raw SSE data string into chunks
   */
  static parseSSEData(rawData: string): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const lines = rawData.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.substring(6); // Remove 'data: ' prefix
          const chunk: StreamingChunk = JSON.parse(jsonStr);
          chunks.push(chunk);
        } catch (parseError) {
          console.warn('Failed to parse SSE data line:', parseError, 'Line:', line);
        }
      }
    }

    return chunks;
  }

  /**
   * Create a preprocessor instance
   */
  static create(): StreamingDataPreprocessor {
    return new StreamingDataPreprocessor();
  }
}

// Utility functions for working with streaming data

/**
 * Convert raw streaming chunks to a single coherent message
 */
export function assembleStreamingMessage(chunks: StreamingChunk[]): ProcessedMessage | null {
  const preprocessor = StreamingDataPreprocessor.create();
  const messages = preprocessor.processChunks(chunks);
  return messages.length > 0 ? messages[0] : null;
}

/**
 * Extract suggestions from streaming chunks
 */
export function extractSuggestions(chunks: StreamingChunk[]): string[] {
  for (const chunk of chunks) {
    if (chunk.suggestions && chunk.suggestions.length > 0) {
      return chunk.suggestions;
    }
  }
  return [];
}

/**
 * Extract citations from streaming chunks
 */
export function extractCitations(chunks: StreamingChunk[]): Array<{
  id: string;
  url: string | null;
  title: string;
  contentId: string | null;
  type: string;
  subtype: string;
  text: string;
}> {
  for (const chunk of chunks) {
    if (chunk.citations && chunk.citations.length > 0) {
      return chunk.citations.map(citation => ({
        id: citation.id,
        url: citation.url,
        title: citation.title,
        contentId: citation.content_id || citation.contentId || null,
        type: citation.type,
        subtype: citation.subtype,
        text: citation.text
      }));
    }
  }
  return [];
}

/**
 * Check if streaming chunks contain a complete message
 */
export function isCompleteMessage(chunks: StreamingChunk[]): boolean {
  return chunks.some(chunk => chunk.is_final || chunk.isFinal || chunk.close);
}

/**
 * Get the final chunk from a series of streaming chunks
 */
export function getFinalChunk(chunks: StreamingChunk[]): StreamingChunk | null {
  return chunks.find(chunk => chunk.is_final || chunk.isFinal || chunk.close) || null;
}
