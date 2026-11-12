import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tripId, title, description, imageUrl, date, startTime, endTime, location, latitude, longitude, category, estimatedCost } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!tripId || !title || !date) {
      return res.status(400).json({ message: 'Trip ID, title, and date are required' });
    }

    const member = await prisma.tripMember.findFirst({
      where: { tripId, userId },
    });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify activities' });

    // Calculate max order for the given date
    const lastActivity = await prisma.activity.findFirst({
      where: { tripId, date: new Date(date) },
      orderBy: { order: 'desc' },
    });
    const order = lastActivity ? lastActivity.order + 1 : 0;

    const activity = await prisma.activity.create({
      data: {
        tripId,
        title,
        description,
        imageUrl: imageUrl || null,
        date: new Date(date),
        startTime,
        endTime,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        category: category || 'Activity',
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        order,
      },
    });

    return res.status(201).json({ message: 'Activity created', activity });
  } catch (error: any) {
    console.error('Create activity error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, description, imageUrl, date, startTime, endTime, location, latitude, longitude, category, estimatedCost, order } = req.body;

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: activity.tripId, userId },
    });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify activities' });

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        location,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        category,
        estimatedCost: estimatedCost !== undefined ? parseFloat(estimatedCost) : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
      },
    });

    return res.json({ message: 'Activity updated', activity: updated });
  } catch (error: any) {
    console.error('Update activity error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const member = await prisma.tripMember.findFirst({
      where: { tripId: activity.tripId, userId },
    });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify activities' });

    await prisma.activity.delete({ where: { id } });
    return res.json({ message: 'Activity deleted' });
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const reorderActivities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tripId, activities } = req.body; // activities: array of { id, order, date }

    if (!Array.isArray(activities)) {
      return res.status(400).json({ message: 'Invalid activity list' });
    }

    const member = await prisma.tripMember.findFirst({ where: { tripId, userId } });
    if (!member) return res.status(403).json({ message: 'Access denied' });
    if (member.role === 'VIEWER') return res.status(403).json({ message: 'Viewers cannot modify activities' });

    const updates = activities.map((act: { id: string; order: number; date?: string }) =>
      prisma.activity.update({
        where: { id: act.id },
        data: {
          order: act.order,
          date: act.date ? new Date(act.date) : undefined,
        },
      })
    );

    await prisma.$transaction(updates);

    return res.json({ message: 'Activities reordered' });
  } catch (error: any) {
    console.error('Reorder activities error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
