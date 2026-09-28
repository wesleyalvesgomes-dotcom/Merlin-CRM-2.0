import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { Sparkles, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060A12] flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-[#1D68FF]/15 border border-[#1D68FF]/30 rounded-[16px] shadow-[0_0_24px_rgba(29,104,255,0.2)]">
            <Sparkles className="h-8 w-8 text-[#00C7F2] animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm text-[#8E9DB8] font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-[#1D68FF]" />
            <span>Carregando Merlin CRM...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
};
