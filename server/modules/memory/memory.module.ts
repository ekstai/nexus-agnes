import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';

@Module({
  providers: [MemoryService],
  controllers: [MemoryController],
  exports: [MemoryService],
})
export class MemoryModule {}