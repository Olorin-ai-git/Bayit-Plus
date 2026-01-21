/**
 * Enhanced Database Service
 * Advanced database operations with caching and performance optimization
  */

import { admin, db, FieldValue } from '@cvplus/core';
import { WithFieldValue, DocumentData } from 'firebase-admin/firestore';

export interface DatabaseQuery {
  collection: string;
  filters?: Record<string, any>;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface DatabaseResult<T = any> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

export class EnhancedDbService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = db;
  }

  async query<T = any>(query: DatabaseQuery): Promise<DatabaseResult<T>> {
    let ref: any = this.db.collection(query.collection);

    // Apply filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([field, value]) => {
        ref = ref.where(field, '==', value);
      });
    }

    // Apply ordering
    if (query.orderBy) {
      query.orderBy.forEach(({ field, direction }) => {
        ref = ref.orderBy(field, direction);
      });
    }

    // Apply limit
    if (query.limit) {
      ref = ref.limit(query.limit);
    }

    const snapshot = await ref.get();
    const data = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      data,
      totalCount: data.length,
      hasMore: snapshot.docs.length === query.limit
    };
  }

  async save<T extends Record<string, any>>(collection: string, id: string, data: T): Promise<void> {
    await this.db.collection(collection).doc(id).set(data as WithFieldValue<DocumentData>);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const doc = await this.db.collection(collection).doc(id).get();
    return doc.exists ? doc.data() as T : null;
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }

  async upsertRAGProfile(userId: string, profileData: any): Promise<void> {
    // Upsert RAG profile data
    await this.save('rag_profiles', userId, {
      ...profileData,
      updatedAt: new Date()
    });
  }
}

// Export singleton instance
export const enhancedDbService = new EnhancedDbService();