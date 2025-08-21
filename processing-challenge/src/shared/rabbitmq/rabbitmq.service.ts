/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: amqp.ChannelWrapper;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
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

          await channel.assertQueue(
            this.configService.get('RABBITMQ_QUEUE_NAME'),
            {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'dlx_exchange',
                'x-dead-letter-routing-key': 'dlq_routing_key',
              },
            },
          );
        },
      });

      this.logger.log('Connected in a RabbitMQ with success');
    } catch (error) {
      this.logger.error('Erro when connect in RabbitMQ', error);
      throw error;
    }
  }

  async publishEvent(event: any): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue(
        `${this.configService.get('RABBITMQ_QUEUE_NAME')}`,
        Buffer.from(JSON.stringify(event)),
      );
      this.logger.debug('Event publish in queue', {
        eventType: event.eventType,
      });
    } catch (error) {
      this.logger.error('Error when publish event', error);
      throw error;
    }
  }

  private async disconnect() {
    if (this.connection) {
      await this.connection.close();
      this.logger.log('Conexão com RabbitMQ fechada');
    }
  }
}
