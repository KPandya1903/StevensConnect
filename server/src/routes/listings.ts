import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { imageUpload, videoUpload } from '../config/upload';
import {
  listingsController,
  createListingSchema,
  updateListingSchema,
  setStatusSchema,
  reportSchema,
  removeImageSchema,
} from '../controllers/listingsController';

export const listingsRouter = Router();

// All listing routes require authentication
listingsRouter.use(authenticate);

// Browse & detail — authenticated but not required to be verified (read-only)
listingsRouter.get('/',    listingsController.getAll);
listingsRouter.get('/:id', listingsController.getById);

// Write operations — must be verified
listingsRouter.post('/',
  requireVerified,
  validate(createListingSchema),
  listingsController.create,
);

listingsRouter.put('/:id',
  requireVerified,
  validate(updateListingSchema),
  listingsController.update,
);

listingsRouter.delete('/:id',
  requireVerified,
  listingsController.close,
);

listingsRouter.patch('/:id/status',
  requireVerified,
  validate(setStatusSchema),
  listingsController.setStatus,
);

listingsRouter.post('/:id/images',
  requireVerified,
  imageUpload.array('images', 8),
  listingsController.uploadImages,
);

listingsRouter.delete('/:id/images',
  requireVerified,
  validate(removeImageSchema),
  listingsController.removeImage,
);

listingsRouter.post('/:id/save',
  requireVerified,
  listingsController.toggleSave,
);

listingsRouter.post('/:id/report',
  requireVerified,
  validate(reportSchema),
  listingsController.report,
);

listingsRouter.post('/:id/video',
  requireVerified,
  videoUpload.single('video'),
  listingsController.uploadVideo,
);

listingsRouter.delete('/:id/video',
  requireVerified,
  listingsController.removeVideo,
);
