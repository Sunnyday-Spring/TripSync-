import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('สมัครสมาชิกสำเร็จ!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-[calc(100vh-61px)] flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat py-8 sm:py-12"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2070&q=85')`,
      }}
    >
      {/* Dark overlay with subtle backdrop blur for visual depth & contrast */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/60 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-3 text-blue-600 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">สร้างบัญชีผู้ใช้ใหม่</h1>
          <p className="text-xs text-gray-500 mt-1.5 font-normal">เริ่มต้นวางแผนทริปท่องเที่ยวแบบ Real-time</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              ชื่อผู้ใช้ (Full Name)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อ-นามสกุล หรือชื่อเล่นของคุณ"
                className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              อีเมล (Email)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors min-h-[44px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-5"
          >
            <span>{loading ? 'กำลังลงทะเบียน...' : 'สร้างบัญชี'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-500">
          มีบัญชีสมาชิกอยู่แล้ว?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
};
