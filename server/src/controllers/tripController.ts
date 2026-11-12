import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createTrip = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, description, startDate, endDate, customInviteCode } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อทริป วันที่เริ่ม และวันที่สิ้นสุด' });
    }

    let inviteCode: string;
    if (customInviteCode && typeof customInviteCode === 'string' && customInviteCode.trim()) {
      const clean = customInviteCode.trim().toUpperCase();
      const existing = await prisma.trip.findFirst({
        where: { inviteCode: { equals: clean, mode: 'insensitive' } },
      });
      if (existing) {
        return res.status(400).json({ message: `รหัสทริป "${clean}" มีผู้อื่นใช้งานแล้ว กรุณาเลือกรหัสอื่น` });
      }
      inviteCode = clean;
    } else {
      // Auto-generate clean 6-character short code (e.g. "TRIP9X", "CNX888")
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        inviteCode,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    return res.status(201).json({ message: 'สร้างทริปใหม่สำเร็จ', trip });
  } catch (error: any) {
    console.error('Create trip error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getTrips = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const trips = await prisma.trip.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: {
          select: { activities: true, expenses: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return res.json({ trips });
  } catch (error: any) {
    console.error('Get trips error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getTripById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const trip = await prisma.trip.findFirst({
      where: {
        id,
        members: { some: { userId } },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        activities: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true, avatar: true } },
            splits: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or access denied' });
    }

    return res.json({ trip });
  } catch (error: any) {
    console.error('Get trip detail error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateTrip = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description, startDate, endDate, customInviteCode } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });

    if (trip.ownerId !== userId && !member) {
      return res.status(403).json({ message: 'Permission denied. Only Owner or Admin can update trip.' });
    }

    let newInviteCode = trip.inviteCode;
    if (customInviteCode && typeof customInviteCode === 'string' && customInviteCode.trim()) {
      const clean = customInviteCode.trim().toUpperCase();
      if (clean !== trip.inviteCode) {
        const existing = await prisma.trip.findFirst({
          where: {
            inviteCode: { equals: clean, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (existing) {
          return res.status(400).json({ message: `รหัสทริป "${clean}" มีผู้อื่นใช้งานแล้ว กรุณาเลือกรหัสอื่น` });
        }
        newInviteCode = clean;
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        name: name !== undefined ? name : trip.name,
        description: description !== undefined ? description : trip.description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        inviteCode: newInviteCode,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: {
          select: {
            activities: true,
            expenses: true,
          },
        },
      },
    });

    return res.json({ message: 'แก้ไขข้อมูลทริปสำเร็จ', trip: updatedTrip });
  } catch (error: any) {
    console.error('Update trip error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const deleteTrip = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });

    if (trip.ownerId !== userId && (!member || member.role !== 'OWNER')) {
      return res.status(403).json({ message: 'Only trip owner can delete this trip' });
    }

    // Cascade delete safely in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all expense splits for this trip's expenses
      const expenses = await tx.expense.findMany({ where: { tripId: id }, select: { id: true } });
      const expenseIds = expenses.map((e) => e.id);
      if (expenseIds.length > 0) {
        await tx.expenseSplit.deleteMany({
          where: { expenseId: { in: expenseIds } },
        });
      }

      // 2. Delete all expenses
      await tx.expense.deleteMany({ where: { tripId: id } });

      // 3. Delete all activities
      await tx.activity.deleteMany({ where: { tripId: id } });

      // 4. Delete all trip members
      await tx.tripMember.deleteMany({ where: { tripId: id } });

      // 5. Delete the trip itself
      await tx.trip.delete({ where: { id } });
    });

    return res.json({ message: 'Trip deleted successfully' });
  } catch (error: any) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const joinTripByInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { inviteCode } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสทริป (Invite Code)' });
    }

    const cleanCode = inviteCode.trim();

    // Look up trip case-insensitively so "trip123" and "TRIP123" both match!
    const trip = await prisma.trip.findFirst({
      where: {
        inviteCode: {
          equals: cleanCode,
          mode: 'insensitive',
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ message: `ไม่พบทริปที่มีรหัส "${cleanCode}" กรุณาตรวจสอบรหัสอีกครั้ง` });
    }

    const existingMember = await prisma.tripMember.findFirst({
      where: { tripId: trip.id, userId },
    });

    if (existingMember) {
      return res.status(400).json({ message: `คุณเป็นสมาชิกของทริป "${trip.name}" อยู่แล้ว`, tripId: trip.id });
    }

    await prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId,
        role: 'MEMBER',
      },
    });

    return res.json({ message: `เข้าร่วมทริป "${trip.name}" สำเร็จ!`, tripId: trip.id });
  } catch (error: any) {
    console.error('Join trip error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าร่วมทริป', error: error.message });
  }
};

export const deleteTripDay = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { dateStr, dayIndex } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: id, userId },
    });
    if (!member) return res.status(403).json({ message: 'Permission denied' });

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { activities: true },
    });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Calculate days list
    const days: string[] = [];
    let curr = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    while (curr <= end) {
      days.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    if (days.length <= 1) {
      return res.status(400).json({ message: 'ทริปต้องมีอย่างน้อย 1 วัน ไม่สามารถลบได้' });
    }

    let targetIdx = typeof dayIndex === 'number' ? dayIndex : days.indexOf(dateStr);
    if (targetIdx < 0 || targetIdx >= days.length) {
      return res.status(400).json({ message: 'ไม่พบวันที่ต้องการลบ' });
    }

    const targetDateStr = days[targetIdx];

    await prisma.$transaction(async (tx) => {
      // 1. Delete all activities on the target date
      const targetActivities = trip.activities.filter((act) => {
        const dStr = new Date(act.date).toISOString().split('T')[0];
        return dStr === targetDateStr;
      });

      if (targetActivities.length > 0) {
        await tx.activity.deleteMany({
          where: { id: { in: targetActivities.map((a) => a.id) } },
        });
      }

      if (targetIdx === 0) {
        // If first day was deleted, advance trip.startDate to days[1]
        const newStartDate = new Date(days[1] + 'T00:00:00.000Z');
        await tx.trip.update({
          where: { id },
          data: { startDate: newStartDate },
        });
      } else {
        // Shift activities of subsequent days forward by 1 day
        for (let i = targetIdx + 1; i < days.length; i++) {
          const fromDateStr = days[i];
          const toDateStr = days[i - 1];
          const actsToShift = trip.activities.filter((act) => {
            const dStr = new Date(act.date).toISOString().split('T')[0];
            return dStr === fromDateStr;
          });

          for (const act of actsToShift) {
            await tx.activity.update({
              where: { id: act.id },
              data: { date: new Date(toDateStr + 'T00:00:00.000Z') },
            });
          }
        }

        // Shorten endDate by 1 day
        const newEndDate = new Date(days[days.length - 2] + 'T00:00:00.000Z');
        await tx.trip.update({
          where: { id },
          data: { endDate: newEndDate },
        });
      }
    });

    const updatedTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        activities: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true, avatar: true } },
            splits: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    return res.json({ message: 'ลบวันเดินทางสำเร็จ', trip: updatedTrip });
  } catch (error: any) {
    console.error('Delete trip day error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const addTripDay = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: id, userId },
    });
    if (!member) return res.status(403).json({ message: 'Permission denied' });

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const newEndDate = new Date(trip.endDate);
    newEndDate.setDate(newEndDate.getDate() + 1);

    await prisma.trip.update({
      where: { id },
      data: { endDate: newEndDate },
    });

    const updatedTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        activities: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, email: true, avatar: true } },
            splits: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    return res.json({ message: 'เพิ่มวันเดินทางสำเร็จ', trip: updatedTrip });
  } catch (error: any) {
    console.error('Add trip day error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, memberId } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Check if requesting user is OWNER or ADMIN, or removing themselves (leave trip)
    const requester = await prisma.tripMember.findFirst({
      where: { tripId: id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    const isSelf = userId === memberId;
    if (!requester && !isSelf) return res.status(403).json({ message: 'Only Owner or Admin can remove members' });

    // Cannot remove the owner
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (trip?.ownerId === memberId) {
      return res.status(400).json({ message: 'Cannot remove the trip owner' });
    }

    // Delete the membership
    const existing = await prisma.tripMember.findFirst({ where: { tripId: id, userId: memberId } });
    if (!existing) return res.status(404).json({ message: 'Member not found in this trip' });

    await prisma.tripMember.delete({ where: { id: existing.id } });

    return res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be ADMIN, MEMBER, or VIEWER' });
    }

    // Only OWNER can change roles
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.ownerId !== userId) {
      return res.status(403).json({ message: 'Only the trip owner can change member roles' });
    }

    // Cannot change owner's own role
    if (memberId === userId) {
      return res.status(400).json({ message: 'Cannot change your own role as owner' });
    }

    const membership = await prisma.tripMember.findFirst({ where: { tripId: id, userId: memberId } });
    if (!membership) return res.status(404).json({ message: 'Member not found in this trip' });

    await prisma.tripMember.update({
      where: { id: membership.id },
      data: { role },
    });

    return res.json({ message: `Member role updated to ${role}` });
  } catch (error: any) {
    console.error('Update member role error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
