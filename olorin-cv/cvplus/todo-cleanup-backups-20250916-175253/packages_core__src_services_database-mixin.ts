/**
 * Database Mixin - Reusable database functionality for services
 * 
 * Provides standardized Firestore operations with consistent
 * error handling, transaction support, and query optimization.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { db } from '../config/firebase';
import * as admin from 'firebase-admin';
// TODO: Import Logger type from @cvplus/logging\ntype Logger = { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; warn: (msg: string, data?: any) => void; debug: (msg: string, data?: any) => void; };

export interface DatabaseOptions {
  enableTransactions?: boolean;
  retryAttempts?: number;
  batchSize?: number;
  enableQueryOptimization?: boolean;
}

export interface QueryResult<T> {
  data: T[];
  hasMore: boolean;
  lastVisible?: admin.firestore.DocumentSnapshot;
  totalCount?: number;
}

export interface DatabaseError {
  code: string;
  message: string;
  context?: any;
}

/**
 * Database Mixin - Provides standardized database operations
  */
export class DatabaseMixin {
  protected readonly dbOptions: Required<DatabaseOptions>;
  protected queryCache: Map<string, { data: any; expires: number }> = new Map();

  constructor(
    protected logger: Logger,
    options: DatabaseOptions = {}
  ) {
    this.dbOptions = {
      enableTransactions: true,
      retryAttempts: 3,
      batchSize: 500,
      enableQueryOptimization: true,
      ...options
    };
  }

  /**
   * Get document by ID with optional caching
    */
  protected async getDocument<T>(
    collection: string,
    documentId: string,
    useCache: boolean = false
  ): Promise<T | null> {
    try {
      const cacheKey = `${collection}:${documentId}`;
      
      if (useCache && this.hasValidCache(cacheKey)) {
        this.logger.debug('Database cache hit', { collection, documentId });
        return this.queryCache.get(cacheKey)!.data as T;
      }

      const docRef = db.collection(collection).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        this.logger.debug('Document not found', { collection, documentId });
        return null;
      }

      const data = { id: doc.id, ...doc.data() } as T;
      
      if (useCache) {
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      this.logger.error('Failed to get document', { 
        collection, 
        documentId, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('get_document_failed', error, { collection, documentId });
    }
  }

  /**
   * Create document with auto-generated or custom ID
    */
  protected async createDocument<T>(
    collection: string,
    data: Partial<T>,
    documentId?: string
  ): Promise<{ id: string; data: T }> {
    try {
      const timestamp = new Date();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      } as T;

      let docRef: admin.firestore.DocumentReference;
      
      if (documentId) {
        docRef = db.collection(collection).doc(documentId);
      } else {
        docRef = db.collection(collection).doc();
      }

      await docRef.set(documentData as any);
      
      this.logger.debug('Document created', { 
        collection, 
        documentId: docRef.id 
      });
      
      return {
        id: docRef.id,
        data: { id: docRef.id, ...documentData } as T
      };
    } catch (error) {
      this.logger.error('Failed to create document', { 
        collection, 
        documentId, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('create_document_failed', error, { collection, documentId });
    }
  }

  /**
   * Update document with optimistic locking
    */
  protected async updateDocument<T>(
    collection: string,
    documentId: string,
    updates: Partial<T>,
    useTransaction: boolean = false
  ): Promise<T> {
    try {
      const docRef = db.collection(collection).doc(documentId);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      if (useTransaction && this.dbOptions.enableTransactions) {
        const result = await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          
          if (!doc.exists) {
            throw new Error(`Document ${documentId} not found`);
          }
          
          transaction.update(docRef, updateData);
          return { id: doc.id, ...doc.data(), ...updateData } as T;
        });
        
        return result;
      } else {
        await docRef.update(updateData);
        
        // Return updated document
        const updated = await this.getDocument<T>(collection, documentId);
        return updated!;
      }
    } catch (error) {
      this.logger.error('Failed to update document', { 
        collection, 
        documentId, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('update_document_failed', error, { collection, documentId });
    }
  }

  /**
   * Delete document
    */
  protected async deleteDocument(
    collection: string,
    documentId: string,
    softDelete: boolean = false
  ): Promise<boolean> {
    try {
      const docRef = db.collection(collection).doc(documentId);
      
      if (softDelete) {
        await docRef.update({
          deletedAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        await docRef.delete();
      }
      
      this.logger.debug('Document deleted', { 
        collection, 
        documentId, 
        softDelete 
      });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete document', { 
        collection, 
        documentId, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('delete_document_failed', error, { collection, documentId });
    }
  }

  /**
   * Query documents with pagination
    */
  protected async queryDocuments<T>(
    collection: string,
    filters?: QueryFilter[],
    orderBy?: { field: string; direction: 'asc' | 'desc' }[],
    limit?: number,
    startAfter?: admin.firestore.DocumentSnapshot
  ): Promise<QueryResult<T>> {
    try {
      let query: admin.firestore.Query = db.collection(collection);
      
      // Apply filters
      if (filters) {
        for (const filter of filters) {
          query = query.where(filter.field, filter.operator, filter.value);
        }
      }
      
      // Apply ordering
      if (orderBy) {
        for (const order of orderBy) {
          query = query.orderBy(order.field, order.direction);
        }
      }
      
      // Apply pagination
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      if (limit) {
        query = query.limit(limit + 1); // +1 to check for more data
      }
      
      const snapshot = await query.get();
      const docs = snapshot.docs;
      
      let hasMore = false;
      let lastVisible: admin.firestore.DocumentSnapshot | undefined;
      
      if (limit && docs.length > limit) {
        hasMore = true;
        docs.pop(); // Remove the extra document
        lastVisible = docs[docs.length - 1];
      } else if (docs.length > 0) {
        lastVisible = docs[docs.length - 1];
      }
      
      const data = docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      
      this.logger.debug('Query executed', { 
        collection, 
        filterCount: filters?.length || 0,
        resultCount: data.length,
        hasMore 
      });
      
      return {
        data,
        hasMore,
        lastVisible
      };
    } catch (error) {
      this.logger.error('Query failed', { 
        collection, 
        filters, 
        orderBy, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('query_failed', error, { collection, filters });
    }
  }

  /**
   * Batch operations
    */
  protected async batchOperations(
    operations: DatabaseOperation[]
  ): Promise<void> {
    try {
      if (operations.length === 0) return;
      
      // Split into batches if necessary
      const batches = this.chunkArray(operations, this.dbOptions.batchSize);
      
      for (const batchOps of batches) {
        const batch = db.batch();
        
        for (const op of batchOps) {
          const docRef = db.collection(op.collection).doc(op.documentId);
          
          switch (op.type) {
            case 'create':
              batch.set(docRef, {
                ...op.data,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              break;
            case 'update':
              batch.update(docRef, {
                ...op.data,
                updatedAt: new Date()
              });
              break;
            case 'delete':
              batch.delete(docRef);
              break;
          }
        }
        
        await batch.commit();
      }
      
      this.logger.debug('Batch operations completed', { 
        totalOperations: operations.length,
        batchCount: batches.length 
      });
    } catch (error) {
      this.logger.error('Batch operations failed', { 
        operationCount: operations.length,
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('batch_operations_failed', error, { 
        operationCount: operations.length 
      });
    }
  }

  /**
   * Count documents matching query
    */
  protected async countDocuments(
    collection: string,
    filters?: QueryFilter[]
  ): Promise<number> {
    try {
      let query: admin.firestore.Query = db.collection(collection);
      
      if (filters) {
        for (const filter of filters) {
          query = query.where(filter.field, filter.operator, filter.value);
        }
      }
      
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      this.logger.error('Count query failed', { 
        collection, 
        filters, 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('count_failed', error, { collection, filters });
    }
  }

  /**
   * Execute transaction
    */
  protected async executeTransaction<T>(
    operation: (transaction: admin.firestore.Transaction) => Promise<T>
  ): Promise<T> {
    try {
      if (!this.dbOptions.enableTransactions) {
        throw new Error('Transactions are disabled');
      }
      
      return await db.runTransaction(operation);
    } catch (error) {
      this.logger.error('Transaction failed', { 
        error: this.formatError(error) 
      });
      throw this.createDatabaseError('transaction_failed', error);
    }
  }

  // Helper methods

  private hasValidCache(key: string): boolean {
    const cached = this.queryCache.get(key);
    return cached ? cached.expires > Date.now() : false;
  }

  private setCache(key: string, data: any, ttlMinutes: number = 5): void {
    this.queryCache.set(key, {
      data,
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private formatError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    return error;
  }

  private createDatabaseError(
    code: string, 
    originalError: any, 
    context?: any
  ): DatabaseError {
    return {
      code,
      message: originalError instanceof Error ? originalError.message : String(originalError),
      context
    };
  }
}

// Supporting interfaces

export interface QueryFilter {
  field: string;
  operator: admin.firestore.WhereFilterOp;
  value: any;
}

export interface DatabaseOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
}

/**
 * Factory function to create database mixin
  */
export function createDatabaseMixin(
  logger: Logger,
  options?: DatabaseOptions
): DatabaseMixin {
  return new DatabaseMixin(logger, options);
}