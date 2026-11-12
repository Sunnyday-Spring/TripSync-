import React, { useState } from 'react';
import type { Trip } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Users, Shield, Copy, Check, UserPlus, KeyRound, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  trip: Trip;
  onRefresh: () => void;
}

export const MemberList: React.FC<Props> = ({ trip, onRefresh }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [copied, setCopied] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);

  const isOwner = trip.ownerId === user?.id;
  const currentMember = trip.members?.find((m) => m.userId === user?.id);
  const isAdminOrOwner = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    toast.success('คัดลอก Invite Code เรียบร้อยแล้ว!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`คุณต้องการลบ ${memberName} ออกจากทริปนี้ใช่หรือไม่?`)) return;
    try {
      await api.delete(`/trips/${trip.id}/members/${memberId}`);
      toast.success(`ลบ ${memberName} ออกจากทริปสำเร็จ`);
      onRefresh();
      if (socket) {
        socket.emit('member-changed', { tripId: trip.id, action: 'remove' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบสมาชิกได้');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string, memberName: string) => {
    try {
      await api.put(`/trips/${trip.id}/members/${memberId}/role`, { role: newRole });
      toast.success(`เปลี่ยน Role ของ ${memberName} เป็น ${newRole} สำเร็จ`);
      setRoleDropdownOpen(null);
      onRefresh();
      if (socket) {
        socket.emit('member-changed', { tripId: trip.id, action: 'role-change' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'ไม่สามารถเปลี่ยน Role ได้');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'VIEWER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return '👑 Owner';
      case 'ADMIN': return '⚡ Admin';
      case 'MEMBER': return '👤 Member';
      case 'VIEWER': return '👁️ Viewer';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Link Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <UserPlus className="w-4 h-4" />
            <span>เชิญเพื่อนเข้าร่วมทริป</span>
          </div>
          <h3 className="text-base font-bold text-gray-900">แชร์ Invite Code ให้เพื่อนของคุณ</h3>
          <p className="text-xs text-gray-500 font-normal">
            เพื่อนสามารถกด "เข้าร่วมทริป" ที่หน้า Dashboard แล้ววาง Invite Code นี้ได้เลย
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-200 w-full sm:w-auto">
          <div className="flex items-center space-x-2 px-2 py-1 min-w-0 flex-1">
            <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-mono text-xs text-gray-800 font-semibold truncate select-all">{trip.inviteCode}</span>
          </div>
          <button
            onClick={copyInviteCode}
            className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shrink-0 shadow-xs"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <span>สมาชิกในทริปนี้ ({trip.members?.length || 0} คน)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trip.members?.map((m) => {
            const isSelf = m.userId === user?.id;
            const isMemberOwner = m.role === 'OWNER';
            const canRemove = isAdminOrOwner && !isSelf && !isMemberOwner;
            const canChangeRole = isOwner && !isSelf && !isMemberOwner;

            return (
              <div
                key={m.id}
                className="bg-white p-4 rounded-xl border border-gray-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm flex items-center space-x-1">
                        <span>{m.user.name}</span>
                        {isSelf && <span className="text-[10px] text-blue-600 font-bold">(คุณ)</span>}
                      </h4>
                      <p className="text-xs text-gray-500 font-normal">{m.user.email}</p>
                    </div>
                  </div>

                  {canRemove && (
                    <button
                      onClick={() => handleRemoveMember(m.userId, m.user.name)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={`ลบ ${m.user.name} ออกจากทริป`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  {canChangeRole ? (
                    <div className="relative">
                      <button
                        onClick={() => setRoleDropdownOpen(roleDropdownOpen === m.id ? null : m.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center space-x-1 cursor-pointer transition-colors ${getRoleBadge(m.role)}`}
                      >
                        <span>{getRoleLabel(m.role)}</span>
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      </button>

                      {roleDropdownOpen === m.id && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                          {['ADMIN', 'MEMBER', 'VIEWER'].map((role) => (
                            <button
                              key={role}
                              onClick={() => handleChangeRole(m.userId, role, m.user.name)}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors ${
                                m.role === role ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                              }`}
                            >
                              {getRoleLabel(role)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-md border flex items-center space-x-1 ${getRoleBadge(m.role)}`}
                    >
                      {m.role === 'OWNER' && <Shield className="w-3 h-3 mr-0.5" />}
                      <span>{getRoleLabel(m.role)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
