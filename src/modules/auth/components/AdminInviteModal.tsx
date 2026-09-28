import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Plus, 
  Copy, 
  Check, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { InviteCode } from '../types';

interface AdminInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminInviteModal: React.FC<AdminInviteModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrefix, setCustomPrefix] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchInvites = async () => {
    if (!user || user.role !== 'admin') return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await authService.listInviteCodes(user.id);
      setInvites(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar convites.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvites();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const customCode = customPrefix.trim() ? customPrefix.trim().toUpperCase() : undefined;
      const newInvite = await authService.createInviteCode(user.id, customCode);
      setCustomPrefix('');
      setSuccessMessage(`Código ${newInvite.code} gerado com sucesso!`);
      await fetchInvites();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gerar código de convite.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleRevoke = async (code: string) => {
    if (!window.confirm(`Deseja realmente revogar o código ${code}?`)) return;
    try {
      await authService.revokeInviteCode(user.id, code);
      await fetchInvites();
      setSuccessMessage(`Código ${code} revogado.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao revogar código.');
    }
  };

  const activeCount = invites.filter(i => i.is_active === 1 && !i.used_by).length;
  const usedCount = invites.filter(i => i.used_by).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#16243F] flex items-center justify-between bg-[#080E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1D68FF]/15 text-[#38BDF8] border border-[#1D68FF]/30 rounded-[10px]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gestão de Códigos de Convite
                <span className="text-[10px] bg-[#1D68FF]/20 text-[#38BDF8] px-2 py-0.5 rounded-full border border-[#1D68FF]/30">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-[#8E9DB8]">
                Cadastre e gerencie o acesso exclusivo de corretores da sua equipe ao Merlin CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9DB8] hover:text-white hover:bg-[#101B30] rounded-[8px] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Status alerts */}
          {errorMessage && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs rounded-[10px] p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs rounded-[10px] p-3 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#080E1A] border border-[#16243F] p-3 rounded-[12px]">
              <p className="text-[10px] text-[#8E9DB8] uppercase font-bold tracking-wider">Convites Ativos</p>
              <p className="text-lg font-bold text-[#10B981] mt-0.5">{activeCount}</p>
            </div>
            <div className="bg-[#080E1A] border border-[#16243F] p-3 rounded-[12px]">
              <p className="text-[10px] text-[#8E9DB8] uppercase font-bold tracking-wider">Membros Cadastrados</p>
              <p className="text-lg font-bold text-[#38BDF8] mt-0.5">{usedCount}</p>
            </div>
            <div className="bg-[#080E1A] border border-[#16243F] p-3 rounded-[12px] col-span-2 sm:col-span-1">
              <p className="text-[10px] text-[#8E9DB8] uppercase font-bold tracking-wider">Total Gerados</p>
              <p className="text-lg font-bold text-white mt-0.5">{invites.length}</p>
            </div>
          </div>

          {/* Generator Box */}
          <div className="bg-[#080E1A] border border-[#16243F] p-4 rounded-[12px] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#00C7F2]" />
                Gerar Novo Código de Convite
              </h3>
              <span className="text-[10px] text-[#00C7F2]">Acesso Imediato</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Código customizado (opcional)"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                className="bg-[#060A12] border border-[#16243F] rounded-[8px] px-3 py-2 text-xs text-white uppercase font-mono flex-1 placeholder-[#4B5A75] focus:border-[#1D68FF] outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={isGenerating}
                className="bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold text-xs py-2.5 px-4 rounded-[8px] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Gerar Convite</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Invite Codes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#8E9DB8]" />
                Lista de Convites Emitidos
              </h3>
              <button
                onClick={fetchInvites}
                disabled={isLoading}
                title="Atualizar lista"
                className="text-xs text-[#8E9DB8] hover:text-white p-1 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {isLoading && invites.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8E9DB8] flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#00C7F2]" />
                <span>Carregando convites...</span>
              </div>
            ) : invites.length === 0 ? (
              <div className="bg-[#080E1A] border border-[#16243F] rounded-[12px] p-6 text-center text-xs text-[#8E9DB8]">
                Nenhum código de convite gerado ainda. Clique no botão acima para gerar o primeiro.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {invites.map((inv) => {
                  const isAvailable = inv.is_active === 1 && !inv.used_by;
                  return (
                    <div
                      key={inv.code}
                      className={`p-3 rounded-[12px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                        isAvailable
                          ? 'bg-[#080E1A] border-[#10B981]/30 hover:border-[#10B981]/60'
                          : 'bg-[#080E1A] border-[#16243F] opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-mono text-xs font-bold text-white bg-black/40 px-2.5 py-1 rounded-[6px] border border-[#16243F] tracking-wider select-all">
                          {inv.code}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            {isAvailable ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] font-semibold bg-[#10B981]/15 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-ping" />
                                Disponível
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#8E9DB8] bg-[#101C33] px-2 py-0.5 rounded-full font-medium">
                                Utilizado
                              </span>
                            )}
                            <span className="text-[10px] text-[#4B5A75]">
                              {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          {inv.used_by_name && (
                            <p className="text-[11px] text-[#8E9DB8] mt-0.5 truncate">
                              Usado por: <strong className="text-white">{inv.used_by_name}</strong> ({inv.used_by_email})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(inv.code)}
                          title="Copiar Código"
                          className="px-2.5 py-1.5 bg-[#101B30] hover:bg-[#16243F] text-white text-[11px] font-semibold rounded-[8px] transition-all flex items-center gap-1 cursor-pointer border border-[#16243F]"
                        >
                          {copiedCode === inv.code ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#10B981]" />
                              <span className="text-[#10B981]">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[#8E9DB8]" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.code)}
                            title="Revogar Código"
                            className="p-1.5 text-[#4B5A75] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-[8px] transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#16243F] bg-[#080E1A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#101B30] hover:bg-[#16243F] text-xs font-semibold text-white rounded-[10px] border border-[#16243F] transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
