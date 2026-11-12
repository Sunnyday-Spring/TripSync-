import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { TripDetail } from './pages/TripDetail';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 pb-safe">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trips/:id"
                  element={
                    <ProtectedRoute>
                      <TripDetail />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Toaster
              position="bottom-right"
              gutter={8}
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#FFFFFF',
                  color: '#111827',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  padding: '12px 16px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E5E7EB',
                  maxWidth: '380px',
                  lineHeight: '1.5',
                },
                success: {
                  iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' },
                  style: {
                    background: '#FFFFFF',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                  },
                },
                error: {
                  iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' },
                  style: {
                    background: '#FFFFFF',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                  },
                },
              }}
            />
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
