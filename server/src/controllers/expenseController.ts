import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tripId, title, amount, paidById, category, date, note, participantIds } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!tripId || !title || !amount || !paidById) {
      return res.status(400).json({ message: 'Trip ID, title, amount, and payer are required' });
    }

    const member = await prisma.tripMember.findFirst({ where: { tripId, userId } });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify expenses' });

    const totalAmount = parseFloat(amount);

    // Default to all trip members if participants not specified
    let targetParticipantIds: string[] = participantIds;
    if (!targetParticipantIds || targetParticipantIds.length === 0) {
      const allMembers = await prisma.tripMember.findMany({ where: { tripId } });
      targetParticipantIds = allMembers.map((m) => m.userId);
    }

    const splitAmount = totalAmount / targetParticipantIds.length;

    const expense = await prisma.expense.create({
      data: {
        tripId,
        title,
        amount: totalAmount,
        paidById,
        category: category || 'General',
        date: date ? new Date(date) : new Date(),
        note,
        splits: {
          create: targetParticipantIds.map((pId) => ({
            userId: pId,
            amount: splitAmount,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    return res.status(201).json({ message: 'Expense recorded', expense });
  } catch (error: any) {
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, amount, paidById, category, note, participantIds } = req.body;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const member = await prisma.tripMember.findFirst({ where: { tripId: expense.tripId, userId } });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify expenses' });

    const totalAmount = amount ? parseFloat(amount) : expense.amount;

    // If participants changed, recalculate splits
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Update the expense
      const updated = await tx.expense.update({
        where: { id },
        data: {
          title: title || expense.title,
          amount: totalAmount,
          paidById: paidById || expense.paidById,
          category: category || expense.category,
          note: note !== undefined ? note : expense.note,
        },
      });

      // If participantIds provided, recreate splits
      if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        const splitAmount = totalAmount / participantIds.length;
        await tx.expenseSplit.createMany({
          data: participantIds.map((pId: string) => ({
            expenseId: id,
            userId: pId,
            amount: splitAmount,
          })),
        });
      } else if (amount) {
        // If only amount changed, update existing splits proportionally
        const existingSplits = await tx.expenseSplit.findMany({ where: { expenseId: id } });
        if (existingSplits.length > 0) {
          const newSplitAmount = totalAmount / existingSplits.length;
          for (const split of existingSplits) {
            await tx.expenseSplit.update({
              where: { id: split.id },
              data: { amount: newSplitAmount },
            });
          }
        }
      }

      return updated;
    });

    const result = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    return res.json({ message: 'Expense updated', expense: result });
  } catch (error: any) {
    console.error('Update expense error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const member = await prisma.tripMember.findFirst({ where: { tripId: expense.tripId, userId } });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify expenses' });

    await prisma.expense.delete({ where: { id } });
    return res.json({ message: 'Expense deleted' });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Settlement calculation: calculate net balance for each member in trip
export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tripId } = req.params;

    const member = await prisma.tripMember.findFirst({ where: { tripId, userId } });
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const expenses = await prisma.expense.findMany({
      where: { tripId },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    const members = await prisma.tripMember.findMany({
      where: { tripId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    // Net balance per user ID (paid - share)
    const balances: { [userId: string]: { user: any; netBalance: number; totalPaid: number; totalOwed: number } } = {};

    members.forEach((m) => {
      balances[m.userId] = {
        user: m.user,
        netBalance: 0,
        totalPaid: 0,
        totalOwed: 0,
      };
    });

    let totalTripExpense = 0;

    expenses.forEach((exp) => {
      totalTripExpense += exp.amount;
      if (balances[exp.paidById]) {
        balances[exp.paidById].totalPaid += exp.amount;
        balances[exp.paidById].netBalance += exp.amount;
      }

      exp.splits.forEach((split) => {
        if (balances[split.userId]) {
          balances[split.userId].totalOwed += split.amount;
          balances[split.userId].netBalance -= split.amount;
        }
      });
    });

    // Settlement algorithm (Minimizing transactions)
    const debtors: { userId: string; name: string; amount: number }[] = [];
    const creditors: { userId: string; name: string; amount: number }[] = [];

    Object.values(balances).forEach((b) => {
      if (b.netBalance < -0.01) {
        debtors.push({ userId: b.user.id, name: b.user.name, amount: Math.abs(b.netBalance) });
      } else if (b.netBalance > 0.01) {
        creditors.push({ userId: b.user.id, name: b.user.name, amount: b.netBalance });
      }
    });

    const settlements: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debt = debtors[i].amount;
      const credit = creditors[j].amount;
      const amountToTransfer = Math.min(debt, credit);

      settlements.push({
        from: debtors[i].userId,
        fromName: debtors[i].name,
        to: creditors[j].userId,
        toName: creditors[j].name,
        amount: Math.round(amountToTransfer * 100) / 100,
      });

      debtors[i].amount -= amountToTransfer;
      creditors[j].amount -= amountToTransfer;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return res.json({
      totalTripExpense,
      balances: Object.values(balances),
      settlements,
    });
  } catch (error: any) {
    console.error('Expense summary error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
