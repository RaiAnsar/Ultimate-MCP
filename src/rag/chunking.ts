import { Document, DocumentChunk, ChunkingStrategy } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class DocumentChunker {
  private strategy: ChunkingStrategy;
  
  constructor(strategy: ChunkingStrategy) {
    this.strategy = strategy;
  }
  
  chunk(document: Document): DocumentChunk[] {
    switch (this.strategy.type) {
      case 'fixed':
        return this.fixedSizeChunking(document);
      case 'sentence':
        return this.sentenceChunking(document);
      case 'paragraph':
        return this.paragraphChunking(document);
      case 'semantic':
        return this.semanticChunking(document);
      default:
        throw new Error(`Unknown chunking strategy: ${this.strategy.type}`);
    }
  }
  
  private fixedSizeChunking(document: Document): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const chunkSize = this.strategy.chunkSize || 1000;
    const overlap = this.strategy.chunkOverlap || 200;
    const content = document.content;
    
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkContent = content.slice(start, end);
      
      chunks.push({
        id: uuidv4(),
        documentId: document.id,
        content: chunkContent,
        startIndex: start,
        endIndex: end,
        metadata: {
          chunkIndex: chunks.length,
          totalChunks: Math.ceil(content.length / (chunkSize - overlap))
        }
      });
      
      start += chunkSize - overlap;
    }
    
    return chunks;
  }
  
  private sentenceChunking(document: Document): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(document.content);
    const chunkSize = this.strategy.chunkSize || 5; // Number of sentences per chunk
    const overlap = this.strategy.chunkOverlap || 1;
    
    let currentIndex = 0;
    for (let i = 0; i < sentences.length; i += chunkSize - overlap) {
      const chunkSentences = sentences.slice(i, i + chunkSize);
      const chunkContent = chunkSentences.join(' ');
      const startIndex = currentIndex;
      const endIndex = startIndex + chunkContent.length;
      
      chunks.push({
        id: uuidv4(),
        documentId: document.id,
        content: chunkContent,
        startIndex,
        endIndex,
        metadata: {
          chunkIndex: chunks.length,
          sentenceCount: chunkSentences.length
        }
      });
      
      currentIndex = endIndex + 1;
    }
    
    return chunks;
  }
  
  private paragraphChunking(document: Document): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = this.splitIntoParagraphs(document.content);
    const chunkSize = this.strategy.chunkSize || 3; // Number of paragraphs per chunk
    const overlap = this.strategy.chunkOverlap || 1;
    
    let currentIndex = 0;
    for (let i = 0; i < paragraphs.length; i += chunkSize - overlap) {
      const chunkParagraphs = paragraphs.slice(i, i + chunkSize);
      const chunkContent = chunkParagraphs.join('\n\n');
      const startIndex = currentIndex;
      const endIndex = startIndex + chunkContent.length;
      
      chunks.push({
        id: uuidv4(),
        documentId: document.id,
        content: chunkContent,
        startIndex,
        endIndex,
        metadata: {
          chunkIndex: chunks.length,
          paragraphCount: chunkParagraphs.length
        }
      });
      
      currentIndex = endIndex + 2; // Account for double newline
    }
    
    return chunks;
  }
  
  private semanticChunking(document: Document): DocumentChunk[] {
    // Semantic chunking based on content structure
    const chunks: DocumentChunk[] = [];
    const separators = this.strategy.separators || [
      '\n\n## ', '\n\n### ', '\n\n#### ', // Markdown headers
      '\n\n', // Paragraphs
      '. ', '! ', '? ', // Sentences
    ];
    
    const segments = this.splitBySeparators(document.content, separators);
    const targetSize = this.strategy.chunkSize || 1000;
    
    let currentChunk = '';
    let currentStart = 0;
    
    for (const segment of segments) {
      if (currentChunk.length + segment.length > targetSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          id: uuidv4(),
          documentId: document.id,
          content: currentChunk.trim(),
          startIndex: currentStart,
          endIndex: currentStart + currentChunk.length,
          metadata: {
            chunkIndex: chunks.length,
            semantic: true
          }
        });
        
        currentStart += currentChunk.length;
        currentChunk = segment;
      } else {
        currentChunk += segment;
      }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: uuidv4(),
        documentId: document.id,
        content: currentChunk.trim(),
        startIndex: currentStart,
        endIndex: currentStart + currentChunk.length,
        metadata: {
          chunkIndex: chunks.length,
          semantic: true
        }
      });
    }
    
    return chunks;
  }
  
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with NLP libraries
    const sentenceEnders = /([.!?]+[\s]+)/g;
    const sentences = text.split(sentenceEnders).filter(s => s.trim().length > 0);
    
    // Recombine sentence with its ender
    const result: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      if (i + 1 < sentences.length) {
        result.push(sentences[i] + sentences[i + 1]);
      } else {
        result.push(sentences[i]);
      }
    }
    
    return result;
  }
  
  private splitIntoParagraphs(text: string): string[] {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }
  
  private splitBySeparators(text: string, separators: string[]): string[] {
    let segments = [text];
    
    for (const separator of separators) {
      const newSegments: string[] = [];
      for (const segment of segments) {
        const parts = segment.split(separator);
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            newSegments.push(separator + parts[i]);
          } else {
            newSegments.push(parts[i]);
          }
        }
      }
      segments = newSegments;
    }
    
    return segments.filter(s => s.trim().length > 0);
  }
}