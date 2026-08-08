import { create } from 'zustand';
import type { ConversationDto, MessageDto } from '@shared/api.interface';

interface ConversationState {
  currentConversationId: string | null;
  conversations: ConversationDto[];
  messages: MessageDto[];
  isSending: boolean;
  setCurrentConversation: (id: string | null) => void;
  setConversations: (list: ConversationDto[]) => void;
  setMessages: (msgs: MessageDto[]) => void;
  addMessage: (msg: MessageDto) => void;
  updateMessage: (id: string, patch: Partial<MessageDto>) => void;
  setIsSending: (sending: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  currentConversationId: null,
  conversations: [],
  messages: [],
  isSending: false,
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setConversations: (list) => set({ conversations: list }),
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })),
  setIsSending: (sending) => set({ isSending: sending }),
}));
