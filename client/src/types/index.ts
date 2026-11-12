export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User;
}

export interface Activity {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  estimatedCost: number;
  order: number;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  user: User;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidById: string;
  category: string;
  date: string;
  note?: string;
  paidBy: User;
  splits: ExpenseSplit[];
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  inviteCode: string;
  ownerId: string;
  owner?: User;
  members: TripMember[];
  activities?: Activity[];
  expenses?: Expense[];
  _count?: {
    activities: number;
    expenses: number;
  };
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface BalanceSummary {
  user: User;
  netBalance: number;
  totalPaid: number;
  totalOwed: number;
}
