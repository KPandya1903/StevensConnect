import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { conversationsController, startConversationSchema } from '../controllers/conversationsController';

export const conversationsRouter = Router();

conversationsRouter.use(authenticate, requireVerified);

// POST /api/conversations — find-or-create a conversation with another user
conversationsRouter.post('/', validate(startConversationSchema), conversationsController.start);

// GET /api/conversations — list all conversations for current user
conversationsRouter.get('/', conversationsController.list);

// GET /api/conversations/:id/messages — paginated message history
conversationsRouter.get('/:id/messages', conversationsController.getMessages);
