import { Module } from '@nestjs/common';
import { ModelConfigController } from './model-config.controller';
import { ModelConfigService } from './model-config.service';

@Module({
  controllers: [ModelConfigController],
  providers: [ModelConfigService],
  exports: [ModelConfigService],
})
export class ModelConfigModule {}
