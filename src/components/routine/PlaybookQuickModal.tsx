import React, { useState, useEffect } from 'react';
import { Client, Task } from '../../types';
import { SALES_PLAYBOOK_PILLARS, PlaybookPillarId } from '../../lib/salesPlaybook';
import { 
  X, 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  User, 
  Building2, 
  Flame, 
  Clock, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Zap,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlaybookQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  task?: Task;
  defaultBrokerName?: string;
  defaultCompanyName?: string;
}

export default function PlaybookQuickModal({
  isOpen,
  onClose,
  client,
  task,
  defaultBrokerName = 'Wesley',
  defaultCompanyName = 'INC Empreendimentos'
}: PlaybookQuickModalProps) {
  // Infer best initial pillar
  const initialPillarId: PlaybookPillarId = React.useMemo(() => {
    if (!client) return 'primeiro-contato';
    if (client.status === 'Lead Novo') return 'primeiro-contato';
    if (client.status === 'Contato' || client.status === 'Retrabalho') return 'retrabalho';
    if (client.status === 'Agendado' || client.status === 'Visitou') return 'retrabalho';
    if (client.status === 'Documentação') return 'pre-analise-docs';
    return 'primeiro-contato';
  }, [client]);

  const [selectedPillarId, setSelectedPillarId] = useState<PlaybookPillarId>(initialPillarId);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number>(0);
  const [messageText, setMessageText] = useState<string>('');
  const [brokerName, setBrokerName] = useState<string>(defaultBrokerName);
  const [companyName, setCompanyName] = useState<string>(defaultCompanyName);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [aiGeneratedOptions, setAiGeneratedOptions] = useState<string[]>([]);
  const [customObjection, setCustomObjection] = useState<string>('');

  // Load broker data from storage if available
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('merlin_auth_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.name) setBrokerName(u.name.split(' ')[0]);
      }
    } catch {
      // fallback
    }
  }, []);

  // Update selected pillar when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPillarId(initialPillarId);
      setSelectedScriptIndex(0);
      setAiGeneratedOptions([]);
    }
  }, [isOpen, initialPillarId]);

  const selectedPillar = SALES_PLAYBOOK_PILLARS.find(p => p.id === selectedPillarId) || SALES_PLAYBOOK_PILLARS[0];

  // Populate message text based on selected pillar/template
  useEffect(() => {
    if (!selectedPillar) return;
    const script = selectedPillar.standardScripts[selectedScriptIndex] || selectedPillar.standardScripts[0];
    if (script) {
      let t = script.template;
      const cName = client?.name ? client.name.split(' ')[0] : 'amigo(a)';
      const emp = client?.empreendimento || 'nossos empreendimentos';
      
      t = t.replace(/{NOME}/g, cName)
           .replace(/{CORRETOR}/g, brokerName || 'seu consultor')
           .replace(/{EMPREENDIMENTO}/g, emp)
           .replace(/INC Empreendimentos/g, companyName || 'nossa imobiliária');
      
      setMessageText(t);
    }
  }, [selectedPillar, selectedScriptIndex, client, brokerName, companyName]);

  // AI Message Generation using dynamic Gemini Playbook API
  const handleGenerateWithAi = async () => {
    if (!client) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          pillar: selectedPillarId,
          customObjection: customObjection || undefined,
          brokerName: brokerName.trim() || undefined,
          companyName: companyName.trim() || undefined,
          client: {
            name: client.name,
            phone: client.phone,
            status: client.status,
            empreendimento: client.empreendimento,
            tags: client.tags,
            notes: client.notes,
            comments: client.comments?.map(c => c.text),
            secondBrainSummary: client.secondBrainSummary
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.options && Array.isArray(data.options) && data.options.length > 0) {
          setAiGeneratedOptions(data.options);
          setMessageText(data.options[0]);
        } else if (data.message) {
          setMessageText(data.message);
        }
      }
    } catch (err) {
      console.warn('[PlaybookQuickModal] AI error, keeping standard template:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!client?.phone) {
      alert('Cliente sem telefone cadastrado.');
      return;
    }
    const cleanPhone = client.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const textEncoded = encodeURIComponent(messageText);
    window.open(`https://wa.me/${phoneWithCountry}?text=${textEncoded}`, '_blank');
    onClose();
  };

  if (!isOpen || !client) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="bg-[#0B1323] border border-[#16243F] rounded-t-3xl sm:rounded-[16px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
          id="playbook-quick-modal"
        >
          {/* Mobile Drag Handle */}
          <div className="pt-2.5 pb-1 sm:hidden flex justify-center bg-[#080E1A]">
            <div className="w-12 h-1.5 bg-[#16243F] rounded-full" />
          </div>

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#16243F] flex items-center justify-between bg-[#080E1A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base sm:text-lg">Script WhatsApp Comercial</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D68FF]/15 text-[#38BDF8] border border-[#1D68FF]/30">
                    Playbook Merlin
                  </span>
                </div>
                <p className="text-xs text-[#8E9DB8]">
                  Lead: <span className="text-white font-semibold">{client.name}</span> ({client.phone || 'Sem telefone'})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-[#8E9DB8] hover:text-white hover:bg-[#101B30] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Context & Personalization Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#080E1A] p-2.5 rounded-[12px] border border-[#16243F] text-xs">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span className="text-[#8E9DB8]">Consultor:</span>
                <input
                  type="text"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  className="bg-[#0B1323] border border-[#16243F] rounded-[8px] px-2 py-1 text-white font-medium text-xs focus:outline-none focus:border-[#1D68FF] w-full"
                  placeholder="Nome do Corretor"
                />
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span className="text-[#8E9DB8]">Empresa:</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-[#0B1323] border border-[#16243F] rounded-[8px] px-2 py-1 text-white font-medium text-xs focus:outline-none focus:border-[#1D68FF] w-full"
                  placeholder="Empresa / Imobiliária"
                />
              </div>
            </div>

            {/* Pillar Selector Tabs */}
            <div>
              <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase tracking-wider mb-2">
                Selecione o Pilar do Script:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SALES_PLAYBOOK_PILLARS.map(p => {
                  const isActive = selectedPillarId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPillarId(p.id);
                        setSelectedScriptIndex(0);
                        setAiGeneratedOptions([]);
                      }}
                      className={`text-left p-2 rounded-[10px] border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#1D68FF]/15 text-[#38BDF8] border-[#1D68FF]/50 shadow-[0_0_12px_rgba(29,104,255,0.15)]'
                          : 'bg-[#080E1A] text-[#8E9DB8] border-[#16243F] hover:text-white hover:bg-[#101B30]'
                      }`}
                    >
                      <span className="truncate">{p.shortTitle}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Golden Rule banner */}
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-[12px] p-3 text-xs flex items-start gap-2.5 text-amber-200">
              <Zap className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#F59E0B]">Regra de Ouro: </span>
                <span>{selectedPillar.goldenRule}</span>
              </div>
            </div>

            {/* AI Generation trigger */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">Mensagem Formatada:</span>
              <button
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Ajustando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Personalizar com IA (Gemini)</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Generated alternatives if available */}
            {aiGeneratedOptions.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-[#8E9DB8] font-bold uppercase shrink-0">Opções da IA:</span>
                {aiGeneratedOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessageText(opt)}
                    className={`text-xs px-2.5 py-1 rounded-[8px] border shrink-0 cursor-pointer font-medium transition-all ${
                      messageText === opt
                        ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50'
                        : 'bg-[#080E1A] text-[#8E9DB8] border-[#16243F] hover:text-white'
                    }`}
                  >
                    Opção {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Message Textarea */}
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="w-full bg-[#060A12] border border-[#16243F] rounded-[12px] p-3 text-sm text-white font-normal focus:outline-none focus:border-[#1D68FF] leading-relaxed resize-none"
                placeholder="Mensagem do script..."
              />
              <div className="absolute bottom-2.5 right-2.5 text-[10px] font-mono text-[#4B5A75]">
                {messageText.length} caracteres
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-[#16243F] bg-[#080E1A] flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-semibold bg-[#101B30] hover:bg-[#16243F] text-white border border-[#16243F] transition-all cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#10B981]" />
                  <span className="text-[#10B981] font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#8E9DB8]" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-[10px] text-xs font-semibold text-[#8E9DB8] hover:text-white hover:bg-[#101B30] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-xs font-semibold bg-[#10B981] hover:bg-[#10B981]/90 text-white shadow-lg shadow-[#10B981]/20 transition-all cursor-pointer active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>Abrir WhatsApp</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
