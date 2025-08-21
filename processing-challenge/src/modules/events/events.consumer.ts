import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BatchProcessingService } from '../batch-processing/batch-processing.service';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

@Injectable()
export class EventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsConsumer.name);
  private readonly maxRetries: number;
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: amqp.ChannelWrapper;

  constructor(
    private readonly batchProcessingService: BatchProcessingService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('MAX_RETRY_ATTEMPTS', 3);
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connectWithRetry(maxRetries: number = 5, delay: number = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.connect();
        await this.startConsumer();
        this.logger.log('EventsConsumer successfully initialized');
        return;
      } catch (error) {
        this.logger.warn(
          `EventsConsumer connection attempt ${attempt}/${maxRetries} failed`,
          error.message,
        );
        if (attempt === maxRetries) {
          this.logger.error(
            'EventsConsumer initialization failed after all retries',
            error,
          );
          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async connect() {
    try {
      this.connection = amqp.connect([this.configService.get('RABBITMQ_URL')]);

      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: ConfirmChannel) => {
          await channel.assertExchange('dlx_exchange', 'direct', {
            durable: true,
          });

          await channel.assertQueue('user_interactions_dlq', {
            durable: true,
          });

          await channel.bindQueue(
            'user_interactions_dlq',
            'dlx_exchange',
            'dlq_routing_key',
          );

          // Setup main queue
          const queueName = this.configService.get('RABBITMQ_QUEUE_NAME');
          await channel.assertQueue(queueName, {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'dlx_exchange',
              'x-dead-letter-routing-key': 'dlq_routing_key',
            },
          });
        },
      });

      this.logger.log('Consumer connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Error connecting EventsConsumer to RabbitMQ', error);
      throw error;
    }
  }

  private async startConsumer() {
    try {
      const queueName = this.configService.get('RABBITMQ_QUEUE_NAME');

      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        // Ensure queue exists before trying to consume
        await channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'dlx_exchange',
            'x-dead-letter-routing-key': 'dlq_routing_key',
          },
        });

        await channel.consume(
          queueName,
          (message: ConsumeMessage | null) => {
            if (message) {
              this.handleMessage(message, channel).catch((error) => {
                this.logger.error('Unhandled error in message handler', error);
              });
            }
          },
          {
            noAck: false, // We want to manually acknowledge messages
          },
        );
      });

      this.logger.log('Started consuming messages from queue');
    } catch (error) {
      this.logger.error('Error starting EventsConsumer', error);
      throw error;
    }
  }

  private async handleMessage(
    message: ConsumeMessage,
    channel: ConfirmChannel,
  ) {
    try {
      const content = message.content.toString();
      const data = JSON.parse(content);

      this.logger.debug('Processing queue event', {
        eventType: data.eventType,
        userId: data.userId,
        messageId: message.properties.messageId,
      });

      // Add to batch for processing
      await this.batchProcessingService.addEventToBatch(data);

      // Acknowledge successful processing
      channel.ack(message);

      this.logger.debug('Event successfully added to batch', {
        eventType: data.eventType,
        userId: data.userId,
      });
    } catch (error) {
      this.logger.error('Error processing message', {
        error: error.message,
        messageId: message.properties?.messageId,
      });

      // Handle retry logic
      const retryCount =
        (message.properties.headers?.['x-retry-count'] || 0) + 1;

      if (retryCount <= this.maxRetries) {
        this.logger.warn(
          `Retrying message (attempt ${retryCount}/${this.maxRetries})`,
          { messageId: message.properties?.messageId },
        );

        // Reject and requeue for retry
        channel.nack(message, false, true);
      } else {
        this.logger.error('Retry limit exceeded, sending to DLQ', {
          messageId: message.properties?.messageId,
          retryCount,
        });

        // Send to Dead Letter Queue
        channel.nack(message, false, false);
      }
    }
  }

  private async disconnect() {
    try {
      if (this.connection) {
        await this.connection.close();
        this.logger.log('EventsConsumer connection to RabbitMQ closed');
      }
    } catch (error) {
      this.logger.error('Error closing EventsConsumer connection', error);
    }
  }
}
