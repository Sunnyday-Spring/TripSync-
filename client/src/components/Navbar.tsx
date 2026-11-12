import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Compass, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center space-x-2.5 group min-h-[44px] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center transition-colors group-hover:bg-blue-700 shadow-xs shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-blue-600">TripSync</span>
            <span className="text-[10px] sm:text-[11px] block text-gray-500 font-normal -mt-0.5">Collaborative Planner</span>
          </div>
        </Link>

        {user ? (
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Live Socket Status Badge */}
            <div
              className={`hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'เชื่อมต่อระบบเรียลไทม์แล้ว' : 'กำลังเชื่อมต่อระบบเรียลไทม์...'}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isConnected ? 'ซิงค์สด' : 'กำลังต่อ'}</span>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg py-1 px-2.5 sm:px-3 min-h-[38px]">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-gray-700 max-w-[85px] sm:max-w-[140px] truncate inline-block">{user.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2.5 sm:px-3 text-xs text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
              title="Log out"
            >
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline font-medium">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <Link
              to="/login"
              className="min-h-[44px] flex items-center px-3 sm:px-4 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="min-h-[44px] flex items-center px-3 sm:px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
