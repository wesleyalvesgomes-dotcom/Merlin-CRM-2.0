import React, { useState } from 'react';
import { Client, Task } from '../../types';
import { ACTION_TYPES } from '../MyRoutine';
import { 
  CalendarPlus, 
  X, 
  Check, 
  Clock, 
  ArrowRight, 
  Calendar, 
  Car, 
  MessageSquare, 
  Phone, 
  FileText,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NextStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  completedTask?: Task;
  onScheduleNextStep: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
}

export default function NextStepModal({
  isOpen,
  onClose,
  client,
  completedTask,
  onScheduleNextStep
}: NextStepModalProps) {
  const [actionType, setActionType] = useState<string>('WhatsApp');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [priority, setPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');

  if (!isOpen || !client) return null;

  const handleQuickPreset = (daysToAdd: number, defaultAction = 'WhatsApp', defaultNote = '') => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    onScheduleNextStep({
      clientId: client.id,
      clientName: client.name,
      actionType: defaultAction,
      dueDate: dateStr,
      dueTime: '10:00',
      priority: 'Média',
      notes: defaultNote || `Follow-up após conclusão de: ${completedTask?.notes || completedTask?.actionType || 'tarefa anterior'}`,
      completed: false
    });
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) return;

    onScheduleNextStep({
      clientId: client.id,
      clientName: client.name,
      actionType,
      dueDate,
      dueTime: dueTime || undefined,
      priority,
      notes: notes || `Follow-up com ${client.name}`,
      completed: false
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="bg-[#0B1323] border border-[#16243F] rounded-t-3xl sm:rounded-[16px] w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          id="next-step-modal"
        >
          {/* Mobile Drag Handle */}
          <div className="pt-2.5 pb-1 sm:hidden flex justify-center bg-[#080E1A]">
            <div className="w-12 h-1.5 bg-[#16243F] rounded-full" />
          </div>

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#16243F] bg-[#080E1A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#1D68FF]/15 border border-[#1D68FF]/30 flex items-center justify-center text-[#38BDF8]">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Agendar Próximo Passo</h3>
                <p className="text-xs text-[#8E9DB8]">
                  Lead: <span className="text-white font-semibold">{client.name}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-[8px] text-[#8E9DB8] hover:text-white hover:bg-[#101B30] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider mb-2">
                Atalhos Rápidos de 1 Clique:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickPreset(1, 'WhatsApp', 'Follow-up de alinhamento')}
                  className="p-2.5 rounded-[10px] bg-[#080E1A] border border-[#16243F] hover:border-[#1D68FF] text-left transition-all group cursor-pointer hover:shadow-[0_0_12px_rgba(29,104,255,0.15)]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-[#00C7F2]">
                    <span>Amanhã (+1 dia)</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#4B5A75] group-hover:text-[#00C7F2]" />
                  </div>
                  <span className="text-[10px] text-[#8E9DB8]">WhatsApp às 10h</span>
                </button>

                <button
                  onClick={() => handleQuickPreset(3, 'Ligação', 'Contato de retorno e sondagem')}
                  className="p-2.5 rounded-[10px] bg-[#080E1A] border border-[#16243F] hover:border-[#1D68FF] text-left transition-all group cursor-pointer hover:shadow-[0_0_12px_rgba(29,104,255,0.15)]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-[#00C7F2]">
                    <span>Em 3 Dias</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#4B5A75] group-hover:text-[#00C7F2]" />
                  </div>
                  <span className="text-[10px] text-[#8E9DB8]">Ligação de Retorno</span>
                </button>

                <button
                  onClick={() => handleQuickPreset(7, 'WhatsApp', 'Follow-up semanal de novidades')}
                  className="p-2.5 rounded-[10px] bg-[#080E1A] border border-[#16243F] hover:border-[#1D68FF] text-left transition-all group cursor-pointer hover:shadow-[0_0_12px_rgba(29,104,255,0.15)]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-[#00C7F2]">
                    <span>Próxima Semana</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#4B5A75] group-hover:text-[#00C7F2]" />
                  </div>
                  <span className="text-[10px] text-[#8E9DB8]">+7 dias no WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const d = new Date();
                    const dayOfWeek = d.getDay();
                    const distanceToSat = (6 - dayOfWeek + 7) % 7 || 7;
                    handleQuickPreset(distanceToSat, 'Visita ao Imóvel', 'Visita agendada ao decorado/plantão');
                  }}
                  className="p-2.5 rounded-[10px] bg-[#080E1A] border border-[#16243F] hover:border-[#F59E0B] text-left transition-all group cursor-pointer hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F59E0B] group-hover:text-[#FBBF24]">
                    <span>Visita no Sábado</span>
                    <Car className="h-3.5 w-3.5 text-[#F59E0B]" />
                  </div>
                  <span className="text-[10px] text-[#8E9DB8]">Plantão / Decorado</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#16243F]"></div>
              <span className="flex-shrink mx-2 text-[10px] text-[#4B5A75] uppercase font-bold">Ou Personalizar</span>
              <div className="flex-grow border-t border-[#16243F]"></div>
            </div>

            {/* Custom Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase mb-1">Ação:</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Ligação">Ligação</option>
                    <option value="Visita ao Imóvel">Visita ao Imóvel</option>
                    <option value="Enviar Proposta">Enviar Proposta</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Contrato / Docs">Contrato / Docs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase mb-1">Data:</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase mb-1">Notas / Objetivo:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pegar holerites para aprovação Caixa..."
                  className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white placeholder-[#4B5A75] focus:outline-none focus:border-[#1D68FF]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-[#8E9DB8] hover:text-white px-3 py-2 cursor-pointer font-medium"
                >
                  Concluir sem novo passo
                </button>

                <button
                  type="submit"
                  disabled={!dueDate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Salvar Tarefa</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
