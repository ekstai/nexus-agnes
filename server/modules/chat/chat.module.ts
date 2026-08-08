import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [ConversationModule, LlmModule, MemoryModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}