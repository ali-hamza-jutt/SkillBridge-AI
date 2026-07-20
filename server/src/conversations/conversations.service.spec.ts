import { Types } from 'mongoose';

import { ConversationsService } from './conversations.service';
import { ChatMessageStatus, ChatMessageType } from './schemas/message.schema';

jest.mock('../bids/schemas/bid.schema', () => ({
  Bid: class Bid {},
}));

describe('ConversationsService message pagination', () => {
  it('uses the oldest returned message as the next-page cursor', async () => {
    const userId = 'client-user';
    const baseTime = Date.UTC(2026, 0, 1);

    const messagesNewestFirst = Array.from({ length: 51 }, (_, index) => {
      const ordinal = 120 - index;
      return {
        _id: new Types.ObjectId(ordinal.toString(16).padStart(24, '0')),
        conversationId: 'conversation-id',
        senderId: 'sender-user',
        senderName: 'Sender',
        body: `message-${ordinal}`,
        messageType: ChatMessageType.TEXT,
        status: ChatMessageStatus.SENT,
        createdAt: new Date(baseTime + ordinal * 1_000),
        updatedAt: new Date(baseTime + ordinal * 1_000),
      };
    });

    const conversationModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          clientId: userId,
          freelancerId: 'freelancer-user',
        }),
      }),
    };

    const messageModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(messagesNewestFirst),
          }),
        }),
      }),
    };

    const messageMediaModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const usersService = {
      getUserNameMap: jest.fn().mockResolvedValue(new Map([['sender-user', 'Sender']])),
    };

    const utilityService = {
      toISOString: jest.fn((value?: Date) => value?.toISOString() ?? null),
    };

    const service = new ConversationsService(
      conversationModel as never,
      messageModel as never,
      messageMediaModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      usersService as never,
      utilityService as never,
      {} as never,
      {} as never,
    );

    const page = await service.getMessages('conversation-id', userId, 50);

    expect(page.hasMore).toBe(true);
    expect(page.items).toHaveLength(50);
    expect(page.items[0].body).toBe('message-71');
    expect(page.items.at(-1)?.body).toBe('message-120');

    const expectedCursorMessage = messagesNewestFirst[49];
    expect(page.nextCursor).toBe(
      `${expectedCursorMessage.createdAt.toISOString()}|${expectedCursorMessage._id.toString()}`,
    );
  });
});
