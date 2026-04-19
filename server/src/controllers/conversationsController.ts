import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ConversationService } from '../services/ConversationService';

export const startConversationSchema = z.object({
  targetUserId: z.string().uuid('targetUserId must be a UUID'),
  listingId: z.string().uuid().optional().nullable(),
});

export const conversationsController = {
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetUserId, listingId } = req.body as z.infer<typeof startConversationSchema>;
      const result = await ConversationService.startConversation(
        req.user!.id,
        targetUserId,
        listingId,
      );
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await ConversationService.getConversations(req.user!.id);
      res.json({ data: conversations });
    } catch (err) { next(err); }
  },

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { before, limit } = req.query as Record<string, string | undefined>;
      const page = await ConversationService.getMessages(
        req.params.id,
        req.user!.id,
        limit ? Math.min(parseInt(limit, 10), 50) : 30,
        before || undefined,
      );
      res.json({ data: page });
    } catch (err) { next(err); }
  },
};
