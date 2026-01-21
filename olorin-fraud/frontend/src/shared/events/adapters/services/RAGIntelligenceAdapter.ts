/**
 * RAG Intelligence Service Adapter
 * Feature: Retrieval-augmented generation and knowledge management
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { RAGInsight } from '../../eventBus';

/**
 * RAG Intelligence Service Adapter
 * Handles RAG queries, knowledge base updates, and insight generation
 */
export class RAGIntelligenceAdapter extends BaseServiceAdapter {
  constructor() {
    super('rag-intelligence');
  }

  protected initialize(): void {
    this.subscribeToEvent('rag:query:executed', (data) => {
      this.sendMessage('query-executed', data);
    });

    this.subscribeToEvent('rag:knowledge:updated', (data) => {
      this.sendMessage('knowledge-updated', data);
    });

    this.subscribeToEvent('rag:insight:generated', (data) => {
      this.sendMessage('insight-generated', data);
      this.emitEvent('viz:chart:data:updated', {
        chartId: `insight-${data.investigationId}`,
        data: this.formatInsightData(data.insight)
      });
    });
  }

  /** Execute RAG query */
  public executeQuery(queryId: string, query: string, results: any[]): void {
    this.emitEvent('rag:query:executed', { queryId, query, results });
  }

  /** Update knowledge base */
  public updateKnowledge(source: string): void {
    this.emitEvent('rag:knowledge:updated', { source, timestamp: new Date() });
  }

  /** Generate insight */
  public generateInsight(investigationId: string, insight: RAGInsight): void {
    this.emitEvent('rag:insight:generated', { investigationId, insight });
  }

  /** Private: Format insight data for visualization */
  private formatInsightData(insight: RAGInsight): any {
    return {
      confidence: insight.confidence,
      sources: insight.sources.length,
      content_length: insight.content.length
    };
  }
}
