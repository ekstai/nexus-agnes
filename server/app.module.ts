import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ChatModule } from './modules/chat/chat.module';
import { ModelConfigModule } from './modules/model-config/model-config.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { PreferenceModule } from './modules/preference/preference.module';
import { DataModule } from './modules/data/data.module';
import { LlmModule } from './modules/llm/llm.module';
import { MemoryModule } from './modules/memory/memory.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot({
      enableCsrf: false,
    }),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    ConversationModule,
    ChatModule,
    ModelConfigModule,
    PluginModule,
    PreferenceModule,
    DataModule,
    LlmModule,
    MemoryModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
