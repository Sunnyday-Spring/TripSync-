import { Router } from 'express';
import {
  createActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
} from '../controllers/activityController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createActivity);
router.put('/reorder', reorderActivities);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
