/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserInteraction } from './entities/user-interaction.entity';

@Injectable()
export class BatchProcessingService {
  private readonly logger = new Logger(BatchProcessingService.name);
  private eventBuffer: any[] = [];
  private readonly maxBatchSize = 100;
  private isProcessing = false;

  constructor(
    @InjectRepository(UserInteraction)
    private userInteractionRepository: Repository<UserInteraction>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async addEventToBatch(event: any): Promise<void> {
    this.eventBuffer.push({
      ...event,
      timestamp: new Date(event.timestamp || Date.now()),
    });

    this.logger.debug(
      `Added event in buffer. Actual size: ${this.eventBuffer.length}`,
    );

    if (this.eventBuffer.length >= this.maxBatchSize) {
      this.logger.log('Maximum barch size reached, processing...');
      await this.processBatch();
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleScheduledBatchProcessing() {
    if (this.eventBuffer.length > 0 && !this.isProcessing) {
      this.logger.log(
        `Schedule processing: ${this.eventBuffer.length} buffered events`,
      );
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventBuffer.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `Starting batch processing with ${eventsToProcess.length} events`,
      );

      const userInteractions = eventsToProcess.map((event) => ({
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData || {},
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        processed: true,
      }));

      await queryRunner.manager.save(UserInteraction, userInteractions, {
        chunk: 50,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Batch processed successfully: ${eventsToProcess.length} events saved`,
      );

      this.eventEmitter.emit('batch.processed', {
        count: eventsToProcess.length,
        timestamp: new Date(),
        events: eventsToProcess.map((e) => ({
          userId: e.userId,
          eventType: e.eventType,
        })),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Batch processing error', error);

      this.eventBuffer.unshift(...eventsToProcess);
      throw error;
    } finally {
      await queryRunner.release();
      this.isProcessing = false;
    }
  }

  getBufferMetrics() {
    return {
      currentBufferSize: this.eventBuffer.length,
      isProcessing: this.isProcessing,
      maxBatchSize: this.maxBatchSize,
    };
  }
}
