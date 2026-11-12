import { Router } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpenseSummary,
  updateExpense,
} from '../controllers/expenseController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
router.get('/summary/:tripId', getExpenseSummary);

export default router;
