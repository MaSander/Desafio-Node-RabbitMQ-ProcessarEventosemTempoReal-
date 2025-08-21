import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsConsumer } from './events.consumer';
import { RabbitMQModule } from '../../shared/rabbitmq/rabbitmq.module';
import { BatchProcessingModule } from '../batch-processing/batch-processing.module';

@Module({
  imports: [RabbitMQModule, BatchProcessingModule],
  controllers: [EventsController],
  providers: [EventsConsumer],
})
export class EventsModule {}
