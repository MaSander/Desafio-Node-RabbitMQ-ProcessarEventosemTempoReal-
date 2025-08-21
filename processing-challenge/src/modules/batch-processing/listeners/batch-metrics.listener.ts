/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class BatchMetricsListener {
  private readonly logger = new Logger(BatchMetricsListener.name);
  private processedBatches = 0;
  private totalEventsProcessed = 0;

  @OnEvent('batch.processed')
  handleBatchProcessed(payload: any) {
    this.processedBatches++;
    this.totalEventsProcessed += payload.count;

    this.logger.log('=== BATCH METRICS ===', {
      loteAtual: payload.count,
      timestamp: payload.timestamp,
      totalLotesProcessados: this.processedBatches,
      totalEventosProcessados: this.totalEventsProcessed,
      tiposDeEventos: this.getEventTypesCount(payload.events),
    });

    // Aqui você pode integrar com sistemas de métricas como Prometheus, DataDog, etc.
    this.sendMetricsToExternalSystem(payload);

    this.logger.log('=== OVERALL METRICS ===', () => {
      this.getOverallMetrics();
    });
  }

  private getEventTypesCount(events: any[]) {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});
  }

  private sendMetricsToExternalSystem(payload: any) {
    // Implementar integração com sistema de métricas externo
    this.logger.debug('Metrics sent to external system', {
      batchId: `batch_${Date.now()}`,
      eventCount: payload.count,
    });
  }

  // Método para obter métricas gerais
  getOverallMetrics() {
    return {
      processedBatches: this.processedBatches,
      totalEventsProcessed: this.totalEventsProcessed,
      averageBatchSize:
        this.processedBatches > 0
          ? Math.round(this.totalEventsProcessed / this.processedBatches)
          : 0,
    };
  }
}
