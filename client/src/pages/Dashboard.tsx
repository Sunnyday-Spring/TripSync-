import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Trip } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus,Compass,Calendar,Users,MapPin,Copy,Check,KeyRound,Sparkles,FolderPlus,Pencil,Trash2,LogOut,AlertTriangle,Search,X,Clock,ArrowUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { detectTripDestination } from '../utils/geoUtils';
import { getDestinationCover } from '../utils/imageUtils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // New Trip form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Trip state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editInviteCode, setEditInviteCode] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Trip state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Leave Trip state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leavingTrip, setLeavingTrip] = useState<Trip | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Join Trip form state
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter state for Left Sidebar Toolbar
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'past'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'joined'>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'newest' | 'name'>('nearest');

  const getTripStatus = (t: Trip) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate);
    end.setHours(23, 59, 59, 999);

    if (now >= start && now <= end) return 'ongoing';
    if (now < start) return 'upcoming';
    return 'past';
  };

  const statusCounts = useMemo(() => {
    let ongoing = 0;
    let upcoming = 0;
    let past = 0;
    let myTrips = 0;
    let joined = 0;

    trips.forEach((t) => {
      const status = getTripStatus(t);
      if (status === 'ongoing') ongoing++;
      else if (status === 'upcoming') upcoming++;
      else past++;

      const currentMember = t.members?.find((m) => m.userId === user?.id);
      const isOwner = t.ownerId === user?.id || currentMember?.role === 'OWNER';
      if (isOwner) myTrips++;
      else joined++;
    });

    return {
      all: trips.length,
      ongoing,
      upcoming,
      past,
      myTrips,
      joined,
    };
  }, [trips, user?.id]);

  const filteredTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = trip.name.toLowerCase().includes(q);
          const matchesDesc = (trip.description || '').toLowerCase().includes(q);
          const dest = detectTripDestination(trip.name, trip.description);
          const matchesDest = dest.name.toLowerCase().includes(q);
          if (!matchesName && !matchesDesc && !matchesDest) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const status = getTripStatus(trip);
          if (status !== statusFilter) return false;
        }

        // Role filter
        if (roleFilter !== 'all') {
          const currentMember = trip.members?.find((m) => m.userId === user?.id);
          const isOwner = trip.ownerId === user?.id || currentMember?.role === 'OWNER';
          if (roleFilter === 'owner' && !isOwner) return false;
          if (roleFilter === 'joined' && isOwner) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (sortBy === 'newest') {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'th');
        }
        return 0;
      });
  }, [trips, searchQuery, statusFilter, roleFilter, sortBy, user?.id]);

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips');
      setTrips(res.data.trips);
    } catch (err) {
      console.error('Failed to load trips:', err);
      toast.error('ไม่สามารถโหลดรายการทริปได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      toast.error('กรุณากรอกชื่อทริป วันที่เริ่ม และวันที่สิ้นสุด');
      return;
    }
    setCreating(true);
    try {
      await api.post('/trips', {
        name,
        description,
        startDate,
        endDate,
        customInviteCode: customInviteCode.trim().toUpperCase(),
      });
      toast.success('สร้างทริปใหม่สำเร็จ!');
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setCustomInviteCode('');
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถสร้างทริปได้');
    } finally {
      setCreating(false);
    }
  };

  const openEditTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setEditName(trip.name);
    setEditDescription(trip.description || '');
    setEditStartDate(new Date(trip.startDate).toISOString().split('T')[0]);
    setEditEndDate(new Date(trip.endDate).toISOString().split('T')[0]);
    setEditInviteCode(trip.inviteCode || '');
    setShowEditModal(true);
  };

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripId || !editName || !editStartDate || !editEndDate) {
      toast.error('กรุณากรอกชื่อทริป วันที่เริ่ม และวันที่สิ้นสุด');
      return;
    }
    setUpdating(true);
    try {
      await api.put(`/trips/${editingTripId}`, {
        name: editName,
        description: editDescription,
        startDate: editStartDate,
        endDate: editEndDate,
        customInviteCode: editInviteCode.trim().toUpperCase(),
      });
      toast.success('แก้ไขข้อมูลทริปสำเร็จ!');
      setShowEditModal(false);
      setEditingTripId(null);
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถแก้ไขทริปได้');
    } finally {
      setUpdating(false);
    }
  };

  const openDeleteTrip = (trip: Trip) => {
    setDeletingTrip(trip);
    setShowDeleteModal(true);
  };

  const handleDeleteTrip = async () => {
    if (!deletingTrip) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${deletingTrip.id}`);
      toast.success('ลบทริปเรียบร้อยแล้ว');
      setShowDeleteModal(false);
      setDeletingTrip(null);
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบทริปได้');
    } finally {
      setDeleting(false);
    }
  };

  const openLeaveTrip = (trip: Trip) => {
    setLeavingTrip(trip);
    setShowLeaveModal(true);
  };

  const handleLeaveTrip = async () => {
    if (!leavingTrip || !user) return;
    setLeaving(true);
    try {
      await api.delete(`/trips/${leavingTrip.id}/members/${user.id}`);
      toast.success('ออกจากทริปเรียบร้อยแล้ว');
      setShowLeaveModal(false);
      setLeavingTrip(null);
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถออกจากทริปได้');
    } finally {
      setLeaving(false);
    }
  };

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || !inviteCode.trim()) {
      toast.error('กรุณากรอกรหัสทริป (Invite Code)');
      return;
    }
    setJoining(true);
    try {
      const res = await api.post('/trips/join', { inviteCode: inviteCode.trim().toUpperCase() });
      toast.success(res.data.message || 'เข้าร่วมทริปสำเร็จ!');
      setShowJoinModal(false);
      setInviteCode('');
      fetchTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถเข้าร่วมทริปได้');
    } finally {
      setJoining(false);
    }
  };

  const copyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('คัดลอก Invite Code แล้ว!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Featured App Billboard Banner */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-md bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] group">
        <img
          src="/tripsync_banner.jpg"
          alt="TripSync Banner"
          className="w-full h-auto max-h-[260px] object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]"
        />
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════
            LEFT SIDEBAR TOOLBAR (col-span-12 lg:col-span-4 xl:col-span-3)
        ═══════════════════════════════════════════════════════ */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-20 order-2 lg:order-1">
          {/* 1. Quick Actions Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">คำสั่งด่วน</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full min-h-[44px] flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>สร้างทริปใหม่</span>
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full min-h-[44px] flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 transition-colors text-xs font-semibold"
            >
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
              <span>เข้าร่วมทริปด้วยรหัส</span>
            </button>
          </div>

          {/* 2. Search Trips Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">ค้นหาทริป</p>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ชื่อทริป หรือสถานที่..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Status Filter Menu */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">สถานะการเดินทาง</p>
            <nav className="space-y-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4" />
                  <span>ทริปทั้งหมด</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    statusFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusCounts.all}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('ongoing')}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'ongoing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>กำลังเดินทาง</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    statusFilter === 'ongoing' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {statusCounts.ongoing}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'upcoming'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>เร็วๆ นี้</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    statusFilter === 'upcoming' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusCounts.upcoming}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('past')}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === 'past'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>จบทริปแล้ว</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    statusFilter === 'past' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusCounts.past}
                </span>
              </button>
            </nav>
          </div>

          {/* 4. Role Filter Menu */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">บทบาทในทริป</p>
            <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setRoleFilter(roleFilter === 'owner' ? 'all' : 'owner')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                  roleFilter === 'owner'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>ฉันสร้าง ({statusCounts.myTrips})</span>
              </button>
              <button
                onClick={() => setRoleFilter(roleFilter === 'joined' ? 'all' : 'joined')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                  roleFilter === 'joined'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>ร่วมทริป ({statusCounts.joined})</span>
              </button>
            </div>
          </div>

          {/* 5. Sort Order */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">เรียงลำดับ</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
            >
              <option value="nearest">ใกล้ถึงวันเดินทางที่สุด</option>
              <option value="newest">สร้างล่าสุด</option>
              <option value="name">ชื่อทริป (ก-ฮ)</option>
            </select>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
            RIGHT MAIN WORKSPACE (col-span-12 lg:col-span-8 xl:col-span-9)
        ═══════════════════════════════════════════════════════ */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0 order-1 lg:order-2">
          {/* Header section with counts & active filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-1.5 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dashboard Workspace</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">ทริปการเดินทางของคุณ</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {filteredTrips.length === trips.length
                  ? `แสดงทริปทั้งหมด (${trips.length} ทริป)`
                  : `พบ ${filteredTrips.length} จากทั้งหมด ${trips.length} ทริป`}
              </p>
            </div>

            {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                }}
                className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>

          {/* Trips List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="skeleton-shimmer h-6 w-36 rounded-md" />
                    <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
                    <div className="skeleton-shimmer h-3 w-full rounded" />
                    <div className="skeleton-shimmer h-3 w-2/3 rounded" />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="skeleton-shimmer h-4 w-24 rounded" />
                    <div className="skeleton-shimmer h-4 w-20 rounded" />
                  </div>
                  <div className="skeleton-shimmer h-11 w-full rounded-xl mt-1" />
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="p-10 rounded-2xl text-center max-w-md mx-auto space-y-3 bg-white border border-gray-200 shadow-xs">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">ยังไม่มีทริปการเดินทาง</h2>
              <p className="text-xs text-gray-500">เริ่มต้นสร้างทริปใหม่ของคุณ หรือใส่ Invite Code เพื่อเข้าร่วมทริปของเพื่อนได้เลย!</p>
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  + สร้างทริปแรกของคุณ
                </button>
              </div>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-10 rounded-2xl text-center max-w-md mx-auto space-y-3 bg-white border border-gray-200 shadow-xs">
              <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">ไม่พบทริปที่ตรงกับตัวกรอง</h2>
              <p className="text-xs text-gray-500">ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูทริปทั้งหมด</p>
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setRoleFilter('all');
                  }}
                  className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTrips.map((trip) => {
                const currentMember = trip.members?.find((m) => m.userId === user?.id);
                const isOwner = trip.ownerId === user?.id || currentMember?.role === 'OWNER';
                const isAdmin = currentMember?.role === 'ADMIN';
                const canManage = isOwner || isAdmin;
                const destInfo = detectTripDestination(trip.name, trip.description);
                const coverUrl = getDestinationCover(trip.name, trip.description);
                const status = getTripStatus(trip);

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-400 transition-colors flex flex-col justify-between group shadow-sm"
                  >
                    {/* Trip Cover Photo */}
                    <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                      <img
                        src={coverUrl}
                        alt={trip.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-black/25 to-transparent pointer-events-none" />

                      {/* Destination Tag & Status Badge */}
                      <div className="absolute top-3 left-3 flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/95 text-gray-800 shadow-sm border border-gray-200/80 backdrop-blur-sm">
                          <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                          {destInfo.name}
                        </span>

                        {status === 'ongoing' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                            กำลังเที่ยว
                          </span>
                        )}
                        {status === 'upcoming' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs backdrop-blur-sm">
                            เร็วๆ นี้
                          </span>
                        )}
                        {status === 'past' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-700 text-white shadow-xs backdrop-blur-sm">
                            จบแล้ว
                          </span>
                        )}
                      </div>

                      {/* Date Tag */}
                      <div className="absolute bottom-2.5 left-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                          <Calendar className="w-3 h-3 mr-1 text-blue-300" />
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                        </span>
                      </div>

                      {/* Actions overlay */}
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            copyInviteCode(trip.inviteCode, trip.id);
                          }}
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-white bg-black/40 hover:bg-black/60 rounded-lg backdrop-blur-sm transition-colors"
                          title="Copy Invite Code"
                        >
                          {copiedId === trip.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {canManage ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                openEditTrip(trip);
                              }}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-white bg-black/40 hover:bg-blue-600 rounded-lg backdrop-blur-sm transition-colors"
                              title="แก้ไขข้อมูลทริป"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                openDeleteTrip(trip);
                              }}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-white bg-black/40 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-colors"
                              title="ลบทริป"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              openLeaveTrip(trip);
                            }}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-white bg-black/40 hover:bg-amber-600 rounded-lg backdrop-blur-sm transition-colors"
                            title="ออกจากทริป"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          <Link to={`/trips/${trip.id}`}>{trip.name}</Link>
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">
                          {trip.description || 'ไม่มีคำอธิบายทริป'}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2.5">
                          <div className="flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>สมาชิก {trip.members?.length || 1} คน</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{trip._count?.activities || 0} สถานที่</span>
                          </div>
                        </div>

                        <Link
                          to={`/trips/${trip.id}`}
                          className="min-h-[44px] w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors border border-blue-200 hover:border-blue-600"
                        >
                          <span>ดูรายละเอียดทริป</span>
                          <Compass className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 text-gray-900 modal-content max-h-[90vh] overflow-y-auto my-auto">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
              <FolderPlus className="w-5 h-5 text-blue-600 shrink-0" />
              <span>สร้างทริปท่องเที่ยวใหม่</span>
            </h2>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ทริปกรุงเทพมหานคร — 3 วัน 2 คืน, เที่ยวเชียงใหม่, ภูเก็ต..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />

                <div className="space-y-1.5 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500">
                    <span>เลือกจุดหมายยอดนิยม:</span>
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>จุดหมาย: {detectTripDestination(name, description).name}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['กรุงเทพฯ', 'เชียงใหม่', 'ภูเก็ต', 'พัทยา', 'หัวหิน', 'เขาใหญ่', 'น่าน'].map((dest) => (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => {
                          if (!name) setName(`ทริป${dest}`);
                          else if (!name.includes(dest)) setName(`${name} (${dest})`);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 transition-colors"
                      >
                        +{dest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">รายละเอียดทริป</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดสั้นๆ เกี่ยวกับทริปนี้..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">วันที่เริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">วันที่สิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  รหัสทริปสำหรับชวนเพื่อน (Invite Code - กำหนดเองได้)
                </label>
                <input
                  type="text"
                  value={customInviteCode}
                  onChange={(e) => setCustomInviteCode(e.target.value.toUpperCase())}
                  placeholder="เช่น CHIANGMAI, TRIP2026 (เว้นว่างเพื่อสุ่ม 6 หลัก)"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wider text-blue-600 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  ตั้งรหัสจำง่ายๆ ให้เพื่อนนำไปกด "เข้าร่วมด้วยรหัส" เพื่อร่วมทริปได้ทันที
                </p>
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'กำลังสร้าง...' : 'สร้างทริป'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Trip Modal */}
      {showEditModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 text-gray-900 modal-content max-h-[90vh] overflow-y-auto my-auto">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Pencil className="w-5 h-5 text-blue-600 shrink-0" />
              <span>แก้ไขข้อมูลทริป</span>
            </h2>

            <form onSubmit={handleUpdateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อทริป *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="เช่น ทริปกรุงเทพมหานคร — 3 วัน 2 คืน, เที่ยวเชียงใหม่, ภูเก็ต..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />

                <div className="space-y-1.5 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500">
                    <span>เลือกจุดหมายยอดนิยม:</span>
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>จุดหมาย: {detectTripDestination(editName, editDescription).name}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['กรุงเทพฯ', 'เชียงใหม่', 'ภูเก็ต', 'พัทยา', 'หัวหิน', 'เขาใหญ่', 'น่าน'].map((dest) => (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => {
                          if (!editName) setEditName(`ทริป${dest}`);
                          else if (!editName.includes(dest)) setEditName(`${editName} (${dest})`);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 transition-colors"
                      >
                        +{dest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">รายละเอียดทริป</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="รายละเอียดสั้นๆ เกี่ยวกับทริปนี้..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">วันที่เริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">วันที่สิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  รหัสทริปสำหรับชวนเพื่อน (Invite Code)
                </label>
                <input
                  type="text"
                  value={editInviteCode}
                  onChange={(e) => setEditInviteCode(e.target.value.toUpperCase())}
                  placeholder="เช่น CHIANGMAI, TRIP2026"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wider text-blue-600 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                <p className="text-[11px] text-gray-400 mt-1">สามารถเปลี่ยนรหัสทริปจำง่ายๆ ให้เพื่อนร่วมทริปได้</p>
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {updating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingTrip && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 text-gray-900 modal-content max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center space-x-3 text-red-600 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">ยืนยันการลบทริป</h3>
                <p className="text-xs text-gray-500">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p>
                คุณแน่ใจหรือไม่ว่าต้องการลบทริป <span className="font-bold text-gray-900">"{deletingTrip.name}"</span>?
              </p>
              <p className="text-red-600">
                * ตารางกิจกรรมและรายการบันทึกค่าใช้จ่ายทั้งหมดในทริปนี้จะถูกลบถาวร
              </p>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingTrip(null);
                }}
                disabled={deleting}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deleting}
                className="min-h-[44px] px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'กำลังลบ...' : 'ยืนยันลบทริปนี้'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Leave Trip Confirmation Modal */}
      {showLeaveModal && leavingTrip && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 text-gray-900 modal-content max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center space-x-3 text-amber-600 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
                <LogOut className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">ออกจากทริป</h3>
                <p className="text-xs text-gray-500">คุณสามารถเข้าร่วมใหม่ได้หากมี Invite Code</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p>
                คุณต้องการออกจากทริป <span className="font-bold text-gray-900">"{leavingTrip.name}"</span> ใช่หรือไม่?
              </p>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeavingTrip(null);
                }}
                disabled={leaving}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleLeaveTrip}
                disabled={leaving}
                className="min-h-[44px] px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>{leaving ? 'กำลังออก...' : 'ยืนยันออกจากทริป'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Join Trip Modal */}
      {showJoinModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 text-gray-900 modal-content max-h-[90vh] overflow-y-auto my-auto">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
              <KeyRound className="w-5 h-5 text-blue-600 shrink-0" />
              <span>เข้าร่วมทริปด้วย Invite Code</span>
            </h2>

            <form onSubmit={handleJoinTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  รหัสทริป (Invite Code) *
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="เช่น CHIANGMAI, TRIP2026 หรือรหัส 6 หลัก"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-wider text-blue-600 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  กรอกรหัสทริปที่เพื่อนส่งมาให้ เพื่อเข้าร่วมวางแผนทริปไปด้วยกัน
                </p>
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วมทริป'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
