import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchProcessingService } from './batch-processing.service';
import { BatchMetricsListener } from './listeners/batch-metrics.listener';
import { UserInteraction } from './entities/user-interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserInteraction])],
  providers: [BatchProcessingService, BatchMetricsListener],
  exports: [BatchProcessingService],
})
export class BatchProcessingModule {}
