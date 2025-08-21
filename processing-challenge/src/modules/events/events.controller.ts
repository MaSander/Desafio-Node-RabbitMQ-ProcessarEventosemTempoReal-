import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { RabbitMQService } from '../../shared/rabbitmq/rabbitmq.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEvent(@Body() createEventDto: CreateEventDto) {
    try {
      await this.rabbitMQService.publishEvent({
        ...createEventDto,
        timestamp: new Date().toISOString(),
      });

      this.logger.log('Event Recived from API', {
        userId: createEventDto.userId,
        eventType: createEventDto.eventType,
      });

      return {
        message: 'Event sent to processing',
        status: 'accepted',
      };
    } catch (error) {
      this.logger.error('Error when processing event from API', error);
      throw error;
    }
  }
}
