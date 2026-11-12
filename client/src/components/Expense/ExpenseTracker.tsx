import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip, Settlement, BalanceSummary } from '../../types';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Plus, Wallet, ArrowRight, Trash2, CheckCircle2, PieChart, Users, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  trip: Trip;
  onRefresh: () => void;
}

export const ExpenseTracker: React.FC<Props> = ({ trip, onRefresh }) => {
  const { socket } = useSocket();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [totalTripExpense, setTotalTripExpense] = useState(0);
  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Add Expense form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(trip.members[0]?.userId || '');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    trip.members.map((m) => m.userId)
  );
  const [submitting, setSubmitting] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/expenses/summary/${trip.id}`);
      setTotalTripExpense(res.data.totalTripExpense);
      setBalances(res.data.balances);
      setSettlements(res.data.settlements);
    } catch (err) {
      console.error('Failed to fetch expense summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [trip]);

  const handleOpenEditExpense = (exp: any) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setPaidById(exp.paidById);
    setCategory(exp.category);
    setNote(exp.note || '');
    setSelectedParticipants(exp.splits?.map((s: any) => s.userId) || trip.members.map((m) => m.userId));
    setShowAddModal(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !paidById) {
      toast.error('กรุณากรอกชื่อรายการ จำนวนเงิน และผู้จ่ายเงิน');
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 คนที่มีส่วนร่วมในค่าใช้จ่ายนี้');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, {
          title,
          amount,
          paidById,
          category,
          note,
          participantIds: selectedParticipants,
        });
        toast.success('แก้ไขค่าใช้จ่ายสำเร็จ!');
      } else {
        await api.post('/expenses', {
          tripId: trip.id,
          title,
          amount,
          paidById,
          category,
          note,
          participantIds: selectedParticipants,
        });
        toast.success('บันทึกค่าใช้จ่ายสำเร็จ!');
      }

      setShowAddModal(false);
      setEditingExpense(null);
      resetForm();
      onRefresh();
      fetchSummary();

      if (socket) {
        socket.emit('expense-changed', { tripId: trip.id, action: editingExpense ? 'update' : 'create' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || (editingExpense ? 'แก้ไขค่าใช้จ่ายไม่สำเร็จ' : 'บันทึกค่าใช้จ่ายไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('คุณต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('ลบค่าใช้จ่ายเรียบร้อย');
      onRefresh();
      fetchSummary();

      if (socket) {
        socket.emit('expense-changed', { tripId: trip.id, action: 'delete' });
      }
    } catch (err) {
      toast.error('ไม่สามารถลบรายการได้');
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setNote('');
    setCategory('Food');
    setSelectedParticipants(trip.members.map((m) => m.userId));
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      if (selectedParticipants.length > 1) {
        setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
      } else {
        toast.error('ต้องเลือกอย่างน้อย 1 คน');
      }
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const memberCount = trip.members.length || 1;
  const avgPerPerson = totalTripExpense / memberCount;

  if (loadingSummary) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-400">
        กำลังคำนวณสรุปค่าใช้จ่าย...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>รวมค่าใช้จ่ายทั้งหมด</span>
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">฿{totalTripExpense.toLocaleString()}</p>
          <p className="text-xs text-gray-500 font-normal">รวมจากรายการทั้งหมดในทริปนี้</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>เฉลี่ยต่อคน ({memberCount} คน)</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">฿{Math.round(avgPerPerson).toLocaleString()}</p>
          <p className="text-xs text-gray-500 font-normal">ยอดหารเท่ากันตามจำนวนสมาชิกในทริป</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>จัดการค่าใช้จ่าย</span>
            <PieChart className="w-4 h-4 text-gray-400" />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors mt-3"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกค่าใช้จ่ายใหม่</span>
          </button>
        </div>
      </div>

      {/* Settlements (ใครต้องโอนให้ใคร) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>สรุปยอดสุทธิของแต่ละคน (Net Balance)</span>
        </h3>

        {balances.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {balances.map((b) => (
              <div key={b.user.id} className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">{b.user.name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      b.netBalance > 0
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : b.netBalance < 0
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {b.netBalance > 0
                      ? `+฿${b.netBalance.toLocaleString()}`
                      : b.netBalance < 0
                      ? `-฿${Math.abs(b.netBalance).toLocaleString()}`
                      : '฿0'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>จ่ายรวม: ฿{b.totalPaid.toLocaleString()}</span>
                  <span>ต้องหาร: ฿{b.totalOwed.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settlements (ใครต้องโอนให้ใคร) */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>สรุปยอดที่ต้องโอนคืนกัน (Settlement Summary)</span>
        </h3>

        {settlements.length === 0 ? (
          <p className="text-xs text-gray-500 py-3 text-center">
            ทุกคนจ่ายเงินเท่ากันพอดี หรือยังไม่มีรายการค่าใช้จ่าย
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {settlements.map((s, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 text-xs font-medium">
                  <span className="text-red-600 font-semibold">{s.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-green-600 font-semibold">{s.toName}</span>
                </div>
                <span className="font-bold text-amber-600 text-sm">฿{s.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          รายการค่าใช้จ่ายทั้งหมด ({trip.expenses?.length || 0} รายการ)
        </h3>

        {(!trip.expenses || trip.expenses.length === 0) ? (
          <div className="text-center py-8 text-xs text-gray-400">
            ยังไม่มีรายการค่าใช้จ่ายในทริปนี้
          </div>
        ) : (
          <div className="space-y-2.5">
            {trip.expenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{exp.title}</h4>
                    <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 font-medium">
                      {exp.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5 text-xs text-gray-500">
                    <span>ผู้จ่าย: <strong className="text-green-600 font-semibold">{exp.paidBy?.name}</strong></span>
                    <span>•</span>
                    <span>หาร {exp.splits?.length || 1} คน</span>
                    {exp.note && (
                      <>
                        <span>•</span>
                        <span className="italic text-gray-400">{exp.note}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-base font-bold text-green-600">
                    ฿{exp.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleOpenEditExpense(exp)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="แก้ไขค่าใช้จ่าย"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบค่าใช้จ่าย"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-4 modal-backdrop">
          <div className="bg-white text-gray-900 w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto modal-content">
            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Plus className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{editingExpense ? 'แก้ไขค่าใช้จ่าย' : 'บันทึกค่าใช้จ่ายใหม่'}</span>
            </h2>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อรายการ *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ค่าโรงแรม 2 คืน, อาหารมื้อเย็น, ค่ากาแฟ"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนเงิน (บาท) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                  >
                    <option value="Food">🍜 อาหาร (Food)</option>
                    <option value="Hotel">🏨 ที่พัก (Hotel)</option>
                    <option value="Transport">🚗 การเดินทาง (Transport)</option>
                    <option value="Tickets">🎟️ ตั๋ว / ค่าเข้า (Tickets)</option>
                    <option value="General">🛍️ เบ็ดเตล็ด (General)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">คนจ่ายเงิน *</label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                >
                  {trip.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      👤 {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">คนร่วมหาร (Participants)</label>
                <div className="grid grid-cols-2 gap-2">
                  {trip.members.map((m) => {
                    const isSelected = selectedParticipants.includes(m.userId);
                    return (
                      <button
                        type="button"
                        key={m.userId}
                        onClick={() => toggleParticipant(m.userId)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{m.user.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Note (เพิ่มเติม)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น โอนผ่าน PromptPay แล้ว"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-600 min-h-[44px]"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : (editingExpense ? 'บันทึกการแก้ไข' : 'บันทึกค่าใช้จ่าย')}
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
