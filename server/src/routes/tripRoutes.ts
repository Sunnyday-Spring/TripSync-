import { Router } from 'express';
import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  joinTripByInviteCode,
  deleteTripDay,
  addTripDay,
  removeMember,
  updateMemberRole,
} from '../controllers/tripController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createTrip);
router.get('/', getTrips);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);
router.post('/join', joinTripByInviteCode);
router.post('/:id/delete-day', deleteTripDay);
router.post('/:id/add-day', addTripDay);
router.delete('/:id/members/:memberId', removeMember);
router.put('/:id/members/:memberId/role', updateMemberRole);

export default router;
