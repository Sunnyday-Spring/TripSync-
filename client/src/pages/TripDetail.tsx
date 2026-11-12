import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Trip } from '../types';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ItineraryView } from '../components/Itinerary/ItineraryView';
import { ExpenseTracker } from '../components/Expense/ExpenseTracker';
import { TripGallery } from '../components/Gallery/TripGallery';
import { MemberList } from '../components/Members/MemberList';
import {
  Calendar,
  Users,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Pencil,
  Trash2,
  LogOut,
  AlertTriangle,
  Copy,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { detectTripDestination } from '../utils/geoUtils';
import { getDestinationCover } from '../utils/imageUtils';

export const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinTrip, leaveTrip } = useSocket();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'gallery' | 'members'>('itinerary');

  // Edit Trip state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editInviteCode, setEditInviteCode] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Trip state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Leave Trip state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchTrip = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/trips/${id}`);
      setTrip(res.data.trip);
    } catch (err: any) {
      console.error('Failed to load trip detail:', err);
      toast.error('ไม่สามารถโหลดข้อมูลทริปได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [id]);

  useEffect(() => {
    if (id && socket) {
      joinTrip(id);

      const handleActivityUpdate = () => {
        toast('มีการอัปเดตกิจกรรมในทริป!', { icon: '⚡' });
        fetchTrip();
      };

      const handleExpenseUpdate = () => {
        toast('มีการอัปเดตค่าใช้จ่ายในทริป!', { icon: '💰' });
        fetchTrip();
      };

      const handleMemberUpdate = () => {
        toast('มีการเปลี่ยนแปลงสมาชิกในทริป!', { icon: '👥' });
        fetchTrip();
      };

      const handleTripUpdate = () => {
        toast('มีการอัปเดตข้อมูลทริป!', { icon: 'ℹ️' });
        fetchTrip();
      };

      socket.on('activity-updated', handleActivityUpdate);
      socket.on('expense-updated', handleExpenseUpdate);
      socket.on('member-updated', handleMemberUpdate);
      socket.on('trip-updated', handleTripUpdate);

      return () => {
        leaveTrip(id);
        socket.off('activity-updated', handleActivityUpdate);
        socket.off('expense-updated', handleExpenseUpdate);
        socket.off('member-updated', handleMemberUpdate);
        socket.off('trip-updated', handleTripUpdate);
      };
    }
  }, [id, socket]);

  const openEditTrip = () => {
    if (!trip) return;
    setEditName(trip.name);
    setEditDescription(trip.description || '');
    setEditStartDate(new Date(trip.startDate).toISOString().split('T')[0]);
    setEditEndDate(new Date(trip.endDate).toISOString().split('T')[0]);
    setEditInviteCode(trip.inviteCode || '');
    setShowEditModal(true);
  };

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName || !editStartDate || !editEndDate) {
      toast.error('กรุณากรอกชื่อทริป วันที่เริ่ม และวันที่สิ้นสุด');
      return;
    }
    setUpdating(true);
    try {
      const res = await api.put(`/trips/${id}`, {
        name: editName,
        description: editDescription,
        startDate: editStartDate,
        endDate: editEndDate,
        customInviteCode: editInviteCode.trim().toUpperCase(),
      });
      toast.success('แก้ไขข้อมูลทริปสำเร็จ!');
      setShowEditModal(false);
      setTrip(res.data.trip);
      if (socket) {
        socket.emit('trip-changed', { tripId: id, action: 'update' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถแก้ไขทริปได้');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${id}`);
      toast.success('ลบทริปเรียบร้อยแล้ว');
      if (socket) {
        socket.emit('trip-changed', { tripId: id, action: 'delete' });
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบทริปได้');
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveTrip = async () => {
    if (!id || !user) return;
    setLeaving(true);
    try {
      await api.delete(`/trips/${id}/members/${user.id}`);
      toast.success('ออกจากทริปเรียบร้อยแล้ว');
      if (socket) {
        socket.emit('member-changed', { tripId: id, action: 'leave' });
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถออกจากทริปได้');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลทริปการเดินทาง...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center bg-white border border-gray-200 rounded-xl space-y-4 mt-12">
        <h2 className="text-xl font-bold text-gray-900">ไม่พบทริปนี้</h2>
        <p className="text-xs text-gray-500">คุณอาจไม่มีสิทธิ์เข้าถึง หรือทริปนี้ถูกลบไปแล้ว</p>
        <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl min-h-[44px]">
          กลับสู่ Dashboard
        </Link>
      </div>
    );
  }

  const currentMember = trip.members?.find((m) => m.userId === user?.id);
  const isOwner = trip.ownerId === user?.id || currentMember?.role === 'OWNER';
  const isAdmin = currentMember?.role === 'ADMIN';
  const canManage = isOwner || isAdmin;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5 pb-20 lg:pb-8">
      {/* Top Bar: Back to Dashboard & Live Presence */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="min-h-[44px] inline-flex items-center space-x-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับสู่ Dashboard</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">โหมดทำงานร่วมกัน (Live Real-time)</span>
            <span className="sm:hidden">Live</span>
          </span>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════
            LEFT SIDEBAR TOOLBAR (col-span-12 lg:col-span-4 xl:col-span-3)
        ═══════════════════════════════════════════════════════ */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-20 order-2 lg:order-1">
          {/* 1. Trip Navigation Menu */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">เมนูแถบเครื่องมือ</p>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'itinerary'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Calendar className="w-4 h-4" />
                  <span>แผนการเดินทาง</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'itinerary' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {trip.activities?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'expenses'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <DollarSign className="w-4 h-4" />
                  <span>บันทึกค่าใช้จ่าย</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'expenses' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {trip.expenses?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'gallery'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>แกลเลอรีรูปภาพ</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'gallery' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {trip.activities?.filter((a) => a.imageUrl).length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'members'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Users className="w-4 h-4" />
                  <span>สมาชิกในทริป</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'members' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {trip.members?.length || 0}
                </span>
              </button>
            </nav>
          </div>

          {/* 2. Invite Code Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">รหัสเชิญเพื่อน</span>
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                <span>Trip Code</span>
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between">
              <code className="text-sm font-mono font-bold text-blue-600 tracking-wider">
                {trip.inviteCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(trip.inviteCode);
                  toast.success('คัดลอกรหัสทริปเรียบร้อย!');
                }}
                className="min-h-[34px] px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors flex items-center space-x-1 border border-transparent hover:border-gray-200"
                title="คัดลอกรหัส"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอก</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              นำรหัสนี้ให้เพื่อนไปกด "เข้าร่วมด้วยรหัส" ที่หน้า Dashboard
            </p>
          </div>

          {/* 3. Export & Utilities */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">เครื่องมือทั่วไป</p>
            <button
              onClick={() => window.print()}
              className="w-full min-h-[40px] flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>พิมพ์ / ส่งออกทริป (Print/PDF)</span>
            </button>
            <button
              onClick={fetchTrip}
              className="w-full min-h-[40px] flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
              <span>รีเฟรชข้อมูลล่าสุด</span>
            </button>
          </div>

          {/* 4. Trip Settings / Management */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs space-y-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">การจัดการทริป</p>
            {canManage ? (
              <>
                <button
                  onClick={openEditTrip}
                  className="w-full min-h-[40px] flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <span>แก้ไขข้อมูลทริป</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full min-h-[40px] flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบทริปนี้</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="w-full min-h-[40px] flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากทริป</span>
              </button>
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
            RIGHT MAIN WORKSPACE (col-span-12 lg:col-span-8 xl:col-span-9)
        ═══════════════════════════════════════════════════════ */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0 order-1 lg:order-2">
          {/* Hero Cover Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 shadow-sm min-h-[200px] sm:min-h-[240px] flex flex-col justify-end">
            <div className="absolute inset-0 w-full h-full">
              <img
                src={getDestinationCover(trip.name, trip.description)}
                alt={trip.name}
                className="w-full h-full object-cover opacity-90"
              />
              {/* Dark gradient for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/60 to-black/30" />
            </div>

            {/* Overlay info */}
            <div className="relative z-10 p-4 sm:p-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white/20 text-white backdrop-blur-md border border-white/30">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600/90 text-white backdrop-blur-md border border-blue-400/40">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-white" />
                  {detectTripDestination(trip.name, trip.description).name}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                {trip.name}
              </h1>
              {trip.description && (
                <p className="text-xs sm:text-sm text-gray-200 font-normal line-clamp-2 max-w-2xl drop-shadow-sm">
                  {trip.description}
                </p>
              )}
            </div>
          </div>

          {/* Active Tab Content */}
          <div key={activeTab} className="tab-panel-enter">
            {activeTab === 'itinerary' && <ItineraryView trip={trip} onRefresh={fetchTrip} />}
            {activeTab === 'expenses' && <ExpenseTracker trip={trip} onRefresh={fetchTrip} />}
            {activeTab === 'gallery' && <TripGallery trip={trip} />}
            {activeTab === 'members' && <MemberList trip={trip} onRefresh={fetchTrip} />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Floating Bar) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'itinerary' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>แผนเที่ยว</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'expenses' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4 mb-0.5" />
          <span>ค่าใช้จ่าย</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'gallery' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 mb-0.5" />
          <span>รูปภาพ</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'members' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>สมาชิก</span>
        </button>
      </div>

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
                <p className="text-[11px] text-gray-400 mt-1">สามารถกำหนดรหัสจำง่ายๆ ให้เพื่อนใช้พิมพ์เข้าร่วมได้</p>
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
      {showDeleteModal && typeof document !== 'undefined' && createPortal(
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
                คุณแน่ใจหรือไม่ว่าต้องการลบทริป <span className="font-bold text-gray-900">"{trip.name}"</span>?
              </p>
              <p className="text-red-600">
                * ตารางกิจกรรมและรายการบันทึกค่าใช้จ่ายทั้งหมดในทริปนี้จะถูกลบถาวร
              </p>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
      {showLeaveModal && typeof document !== 'undefined' && createPortal(
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
                คุณต้องการออกจากทริป <span className="font-bold text-gray-900">"{trip.name}"</span> ใช่หรือไม่?
              </p>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
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
    </div>
  );
};
