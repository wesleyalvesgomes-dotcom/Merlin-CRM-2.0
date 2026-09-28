import React, { useState } from 'react';
import { Task, Client } from '../../types';
import { openGoogleCalendarEvent } from '../../lib/calendarUtils';
import { 
  CheckCircle2, 
  Square, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Clock, 
  CalendarPlus, 
  Flame, 
  Zap, 
  Snowflake, 
  MoreVertical, 
  Trash2, 
  ExternalLink, 
  User, 
  X, 
  Edit3, 
  Check, 
  ArrowRight,
  Car,
  FileText,
  Users,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskCardProps {
  task: Task;
  linkedClient?: Client;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectClient: (clientId: string) => void;
  onOpenPlaybook: (client: Client, task?: Task) => void;
  onReschedule: (task: Task, daysToAdd: number, customDate?: string, customTime?: string) => void;
  onOpenNextStepPrompt?: (client: Client, task: Task) => void;
  isOverdue?: boolean;
}

export const getActionIconAndColor = (type: string) => {
  switch (type) {
    case 'WhatsApp':
      return { icon: MessageSquare, label: 'WhatsApp', color: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30' };
    case 'Ligação':
      return { icon: Phone, label: 'Ligação', color: 'text-[#00C7F2] bg-[#00C7F2]/10 border-[#00C7F2]/30' };
    case 'Visita ao Imóvel':
      return { icon: Car, label: 'Visita', color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' };
    case 'Enviar Proposta':
      return { icon: FileText, label: 'Proposta', color: 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30' };
    case 'Reunião':
      return { icon: Users, label: 'Reunião', color: 'text-[#818CF8] bg-[#818CF8]/10 border-[#818CF8]/30' };
    case 'Contrato / Docs':
      return { icon: FileText, label: 'Contrato / Docs', color: 'text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/30' };
    default:
      return { icon: HelpCircle, label: type || 'Geral', color: 'text-[#8E9DB8] bg-[#8E9DB8]/10 border-[#8E9DB8]/30' };
  }
};

export default function TaskCard({
  task,
  linkedClient,
  onToggleComplete,
  onDeleteTask,
  onSelectClient,
  onOpenPlaybook,
  onReschedule,
  onOpenNextStepPrompt,
  isOverdue = false
}: TaskCardProps) {
  const [showRescheduleMenu, setShowRescheduleMenu] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState(task.dueTime || '');

  const actionInfo = getActionIconAndColor(task.actionType);
  const ActionIcon = actionInfo.icon;

  // Infer Lead Temperature Tag
  const leadTemperature = React.useMemo(() => {
    if (!linkedClient) return null;
    const urgency = typeof linkedClient.secondBrainSummary === 'object' && linkedClient.secondBrainSummary !== null
      ? linkedClient.secondBrainSummary.urgencyLevel
      : undefined;

    if (urgency === 'Alta' || linkedClient.status === 'Proposta' || linkedClient.status === 'Agendado' || linkedClient.status === 'Visitou') {
      return { label: 'Quente', icon: Flame, color: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/30' };
    }
    if (urgency === 'Média' || linkedClient.status === 'Em Atendimento' || linkedClient.status === 'Contato') {
      return { label: 'Morno', icon: Zap, color: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30' };
    }
    return { label: 'Frio', icon: Snowflake, color: 'text-[#38BDF8] bg-[#38BDF8]/15 border-[#38BDF8]/30' };
  }, [linkedClient]);

  const handleToggleClick = () => {
    onToggleComplete(task.id);
    if (!task.completed && linkedClient && onOpenNextStepPrompt) {
      onOpenNextStepPrompt(linkedClient, task);
    }
  };

  const handleWhatsAppAction = () => {
    if (linkedClient) {
      onOpenPlaybook(linkedClient, task);
    } else {
      alert('Tarefa não vinculada a um cliente específico.');
    }
  };

  const handleCustomRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    onReschedule(task, 0, customDate, customTime || undefined);
    setShowRescheduleMenu(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group bg-[#0B1323] border rounded-[16px] p-4 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
        task.completed
          ? 'border-[#16243F] bg-[#060A12]/60 opacity-60'
          : isOverdue
            ? 'border-[#EF4444]/40 bg-[#EF4444]/5 hover:border-[#EF4444]/60'
            : 'border-[#16243F] hover:border-[#1D68FF] hover:shadow-[0_0_12px_rgba(29,104,255,0.2)]'
      }`}
      id={`task-card-${task.id}`}
    >
      {/* Visual Priority Accent Line */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
        task.priority === 'Alta' || isOverdue
          ? 'bg-[#EF4444] shadow-sm shadow-[#EF4444]/50'
          : task.priority === 'Média'
            ? 'bg-[#1D68FF]'
            : 'bg-[#4B5A75]'
      }`} />

      <div className="pl-2 space-y-3">
        {/* Row 1: Checkbox + Action Badge + Time + Temperature Tag + Options */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Complete Checkbox Button */}
            <button
              onClick={handleToggleClick}
              className="text-[#4B5A75] hover:text-[#10B981] transition-colors cursor-pointer shrink-0"
              title={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa agora'}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              ) : (
                <Square className="h-5 w-5 text-[#4B5A75] hover:text-[#00C7F2]" />
              )}
            </button>

            {/* Action Type Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[10px] font-bold border ${actionInfo.color}`}>
              <ActionIcon className="h-3 w-3" />
              <span>{actionInfo.label}</span>
            </span>

            {/* Scheduled Time */}
            {task.dueTime ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#38BDF8] bg-[#101C33] px-2 py-0.5 rounded-[6px] border border-[#1E335A]">
                <Clock className="h-3 w-3" />
                <span>{task.dueTime}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#8E9DB8] font-mono flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#4B5A75]" />
                <span>{task.dueDate}</span>
              </span>
            )}

            {/* Lead Temperature Tag */}
            {leadTemperature && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${leadTemperature.color}`}>
                <leadTemperature.icon className="h-2.5 w-2.5" />
                <span>{leadTemperature.label}</span>
              </span>
            )}

            {/* Google Calendar Synced Badge */}
            {(task.googleCalendarEventId || (task as any).google_event_id) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1D68FF]/15 text-[#38BDF8] border border-[#1D68FF]/30">
                <Calendar className="h-2.5 w-2.5 text-[#38BDF8]" />
                <span>Google Agenda</span>
              </span>
            )}
          </div>

          {/* Quick Reschedule / Delete controls */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => setShowRescheduleMenu(!showRescheduleMenu)}
              className="p-1 rounded-[8px] text-[#8E9DB8] hover:text-[#00C7F2] hover:bg-[#101B30] transition-colors cursor-pointer"
              title="Remarcar / Adiar data"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1 rounded-[8px] text-[#4B5A75] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
              title="Excluir tarefa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Reschedule Inline Dropdown */}
        <AnimatePresence>
          {showRescheduleMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#080E1A] border border-[#16243F] rounded-[12px] p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider">
                <span>Remarcar Tarefa:</span>
                <button onClick={() => setShowRescheduleMenu(false)} className="hover:text-white cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => { onReschedule(task, 0); setShowRescheduleMenu(false); }}
                  className="py-1.5 px-2 rounded-[8px] bg-[#101B30] border border-[#1E335A] text-[11px] font-semibold text-[#8E9DB8] hover:border-[#1D68FF] hover:text-[#00C7F2] transition-all cursor-pointer text-center"
                >
                  Hoje
                </button>
                <button
                  onClick={() => { onReschedule(task, 1); setShowRescheduleMenu(false); }}
                  className="py-1.5 px-2 rounded-[8px] bg-[#101B30] border border-[#1E335A] text-[11px] font-semibold text-[#8E9DB8] hover:border-[#1D68FF] hover:text-[#00C7F2] transition-all cursor-pointer text-center"
                >
                  Amanhã (+1d)
                </button>
                <button
                  onClick={() => { onReschedule(task, 3); setShowRescheduleMenu(false); }}
                  className="py-1.5 px-2 rounded-[8px] bg-[#101B30] border border-[#1E335A] text-[11px] font-semibold text-[#8E9DB8] hover:border-[#1D68FF] hover:text-[#00C7F2] transition-all cursor-pointer text-center"
                >
                  +3 Dias
                </button>
              </div>

              {/* Custom Date Picker */}
              <form onSubmit={handleCustomRescheduleSubmit} className="flex items-center gap-1.5 pt-1">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-[#060A12] border border-[#16243F] rounded-[8px] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#1D68FF] w-full"
                  required
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="bg-[#060A12] border border-[#16243F] rounded-[8px] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#1D68FF] w-24"
                />
                <button
                  type="submit"
                  disabled={!customDate}
                  className="px-2.5 py-1 rounded-[8px] bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold text-xs shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  Salvar
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Notes / Description */}
        <p className={`text-xs font-medium text-white leading-relaxed break-words ${
          task.completed ? 'line-through text-[#4B5A75]' : ''
        }`}>
          {task.notes || 'Sem observações adicionais.'}
        </p>

        {/* Linked Client Header Info */}
        <div className="pt-2 border-t border-[#16243F] flex items-center justify-between gap-2 flex-wrap">
          {task.clientId && linkedClient ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectClient(linkedClient.id)}
                className="text-xs font-semibold text-white hover:text-[#00C7F2] flex items-center gap-1.5 transition-colors cursor-pointer group/link"
              >
                <div className="w-5 h-5 rounded-full bg-[#101C33] border border-[#1E335A] flex items-center justify-center text-[10px] text-[#38BDF8] font-bold">
                  {linkedClient.name.charAt(0)}
                </div>
                <span className="truncate max-w-[140px]">{linkedClient.name}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-50 group-hover/link:opacity-100" />
              </button>

              {linkedClient.phone && (
                <span className="text-[11px] font-mono text-[#8E9DB8] hidden sm:inline">
                  {linkedClient.phone}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-[#4B5A75] italic">Tarefa Geral</span>
          )}

          {/* Direct Execution Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 🟢 WhatsApp Button with Playbook Script */}
            {linkedClient && (
              <button
                onClick={handleWhatsAppAction}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 border border-[#10B981]/30 transition-all cursor-pointer active:scale-95"
                title="Abrir WhatsApp com Script do Playbook"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* ✅ Concluir Button */}
            {!task.completed && (
              <button
                onClick={handleToggleClick}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-[#101B30] hover:bg-[#16243F] text-white border border-[#16243F] hover:border-[#10B981]/50 transition-all cursor-pointer active:scale-95"
                title="Marcar como Concluída"
              >
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Concluir</span>
              </button>
            )}

            {/* ✏️ Remarcar Button */}
            <button
              onClick={() => setShowRescheduleMenu(!showRescheduleMenu)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold bg-[#101B30] hover:bg-[#16243F] text-[#8E9DB8] border border-[#16243F] transition-all cursor-pointer"
              title="Remarcar data"
            >
              <Edit3 className="h-3 w-3" />
              <span>Remarcar</span>
            </button>

            {/* Google Calendar Direct Link */}
            <button
              onClick={() => openGoogleCalendarEvent({
                title: task.notes || `${task.actionType} - ${task.clientName || 'Cliente'}`,
                notes: `Tarefa: ${task.notes || task.actionType}\nLead: ${task.clientName || 'N/A'}\nPrioridade: ${task.priority}`,
                dueDate: task.dueDate,
                dueTime: task.dueTime
              })}
              className="p-1.5 rounded-[10px] bg-[#1D68FF]/10 text-[#38BDF8] hover:bg-[#1D68FF]/20 border border-[#1D68FF]/25 transition-all cursor-pointer"
              title="Abrir no Google Agenda"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
