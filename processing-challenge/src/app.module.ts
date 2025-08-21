import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EventsModule } from './modules/events/events.module';
import { BatchProcessingModule } from './modules/batch-processing/batch-processing.module';
import { RabbitMQModule } from './shared/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env' : ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production', // Apenas para desenvolvimento
        logging: process.env.NODE_ENV === 'development',
      }),
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    RabbitMQModule,
    EventsModule,
    BatchProcessingModule,
  ],
})
export class AppModule {}
