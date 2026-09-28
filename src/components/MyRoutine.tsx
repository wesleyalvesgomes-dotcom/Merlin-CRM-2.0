import React, { useState, useMemo, useEffect } from 'react';
import { Task, Client } from '../types';
import { openGoogleCalendarEvent } from '../lib/calendarUtils';
import TaskCard from './routine/TaskCard';
import StaleLeadCard from './routine/StaleLeadCard';
import PlaybookQuickModal from './routine/PlaybookQuickModal';
import NextStepModal from './routine/NextStepModal';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Car, 
  FileText, 
  Users, 
  Search, 
  Filter, 
  CalendarDays, 
  Sparkles, 
  X, 
  ChevronRight,
  Flame,
  Zap,
  Snowflake,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  CalendarPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MyRoutineProps {
  tasks: Task[];
  clients: Client[];
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectClient: (clientId: string) => void;
  onUpdateClient?: (client: Client) => void;
  showTodayOnly?: boolean;
  onClearTodayOnly?: () => void;
}

export type ActivityFilterType = 'Todas' | 'Primeiro Contato' | 'Retorno/Follow-up' | 'Visita' | 'Documentação/Análise';

export const ACTIVITY_FILTERS: { label: ActivityFilterType; icon: any }[] = [
  { label: 'Todas', icon: Filter },
  { label: 'Primeiro Contato', icon: MessageSquare },
  { label: 'Retorno/Follow-up', icon: Phone },
  { label: 'Visita', icon: Car },
  { label: 'Documentação/Análise', icon: FileText }
];

export const ACTION_TYPES = [
  { label: 'WhatsApp', value: 'WhatsApp' },
  { label: 'Ligação', value: 'Ligação' },
  { label: 'Visita ao Imóvel', value: 'Visita ao Imóvel' },
  { label: 'Enviar Proposta', value: 'Enviar Proposta' },
  { label: 'Reunião', value: 'Reunião' },
  { label: 'Contrato / Docs', value: 'Contrato / Docs' },
  { label: 'Outro', value: 'Outro' }
];

export default function MyRoutine({
  tasks,
  clients,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onSelectClient,
  onUpdateClient,
  showTodayOnly = false,
  onClearTodayOnly
}: MyRoutineProps) {
  const [activeActivityFilter, setActiveActivityFilter] = useState<ActivityFilterType>('Todas');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDayTab, setSelectedDayTab] = useState<string | null>(null);

  // Modals state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [isCreatingWithAI, setIsCreatingWithAI] = useState(false);
  const [smartFeedback, setSmartFeedback] = useState<string | null>(null);

  // Playbook quick modal
  const [playbookModalClient, setPlaybookModalClient] = useState<Client | null>(null);
  const [playbookModalTask, setPlaybookModalTask] = useState<Task | null>(null);
  const [isPlaybookModalOpen, setIsPlaybookModalOpen] = useState(false);

  // Next step prompt modal
  const [nextStepClient, setNextStepClient] = useState<Client | null>(null);
  const [nextStepCompletedTask, setNextStepCompletedTask] = useState<Task | null>(null);
  const [isNextStepModalOpen, setIsNextStepModalOpen] = useState(false);

  // Form states for manual task creation
  const [formClientId, setFormClientId] = useState('');
  const [formActionType, setFormActionType] = useState('WhatsApp');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('10:00');
  const [formPriority, setFormPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [formNotes, setFormNotes] = useState('');

  // Today Date formatted string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter tasks matching activity type
  const matchesActivityFilter = (task: Task, filter: ActivityFilterType): boolean => {
    if (filter === 'Todas') return true;

    const action = (task.actionType || '').toLowerCase();
    const notes = (task.notes || '').toLowerCase();

    if (filter === 'Primeiro Contato') {
      const linked = clients.find(c => c.id === task.clientId);
      return (
        linked?.status === 'Lead Novo' ||
        notes.includes('primeiro contato') ||
        notes.includes('lead novo') ||
        action.includes('primeiro contato')
      );
    }

    if (filter === 'Retorno/Follow-up') {
      return (
        action.includes('whatsapp') ||
        action.includes('ligação') ||
        action.includes('ligacao') ||
        action.includes('reunião') ||
        action.includes('reuniao') ||
        notes.includes('retorno') ||
        notes.includes('follow-up') ||
        notes.includes('sondagem')
      );
    }

    if (filter === 'Visita') {
      return (
        action.includes('visita') ||
        notes.includes('visita') ||
        notes.includes('decorado') ||
        notes.includes('plantão') ||
        notes.includes('plantao')
      );
    }

    if (filter === 'Documentação/Análise') {
      return (
        action.includes('proposta') ||
        action.includes('contrato') ||
        action.includes('docs') ||
        action.includes('documento') ||
        notes.includes('análise') ||
        notes.includes('analise') ||
        notes.includes('caixa') ||
        notes.includes('holerite') ||
        notes.includes('renda')
      );
    }

    return true;
  };

  // Filter tasks based on Search, Status and Activity
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;

      // Activity filter
      if (!matchesActivityFilter(task, activeActivityFilter)) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientMatch = task.clientName?.toLowerCase().includes(term);
        const notesMatch = task.notes?.toLowerCase().includes(term);
        const actionMatch = task.actionType.toLowerCase().includes(term);
        if (!clientMatch && !notesMatch && !actionMatch) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, activeActivityFilter, searchTerm, clients]);

  // 3 Primary Blocks: Overdue/Critical, Today, Next 7 Days
  const { overdueTasks, todayTasks, upcomingTasks, next7DaysTimeline } = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    // Chronological sort
    const sorted = [...filteredTasks].sort((a, b) => {
      const dateCmp = a.dueDate.localeCompare(b.dueDate);
      if (dateCmp !== 0) return dateCmp;
      return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99');
    });

    sorted.forEach(t => {
      if (t.dueDate < todayStr) {
        overdue.push(t);
      } else if (t.dueDate === todayStr) {
        today.push(t);
      } else {
        upcoming.push(t);
      }
    });

    // 7 Days timeline setup
    const days: { dateStr: string; label: string; dayNumber: number; weekDay: string; tasks: Task[] }[] = [];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const dTasks = filteredTasks.filter(t => t.dueDate === dateStr);
      days.push({
        dateStr,
        label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : `${day}/${m}`,
        dayNumber: d.getDate(),
        weekDay: weekDays[d.getDay()],
        tasks: dTasks
      });
    }

    return {
      overdueTasks: overdue,
      todayTasks: today,
      upcomingTasks: upcoming,
      next7DaysTimeline: days
    };
  }, [filteredTasks, todayStr]);

  // Critical Stale Leads (> 15 days without contact)
  const staleLeads = useMemo(() => {
    const now = new Date().getTime();
    const list: { client: Client; daysWithoutContact: number }[] = [];

    clients.forEach(c => {
      if (c.status === 'Venda Fechada' || c.status === 'Perdido') return;

      const contactStr = c.lastContactDate || c.createdAt;
      if (contactStr) {
        const contactTime = new Date(contactStr).getTime();
        if (!isNaN(contactTime)) {
          const diffDays = Math.floor((now - contactTime) / (1000 * 60 * 60 * 24));
          if (diffDays > 15) {
            list.push({ client: c, daysWithoutContact: diffDays });
          }
        }
      }
    });

    return list.sort((a, b) => b.daysWithoutContact - a.daysWithoutContact);
  }, [clients]);

  // Handle task completion + trigger backend PATCH
  const handleToggleComplete = (taskId: string) => {
    onToggleTaskComplete(taskId);

    // Call backend completion endpoint asynchronously for background persistence
    fetch(`/api/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.warn('[Routine Complete API] Warning:', err));
  };

  // Handle task rescheduling
  const handleReschedule = (task: Task, daysToAdd: number, customDate?: string, customTime?: string) => {
    let newDate = customDate;
    if (!newDate) {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      newDate = `${y}-${m}-${day}`;
    }

    onDeleteTask(task.id);
    onAddTask({
      clientId: task.clientId,
      clientName: task.clientName,
      actionType: task.actionType,
      dueDate: newDate,
      dueTime: customTime !== undefined ? customTime : task.dueTime,
      priority: task.priority,
      notes: task.notes,
      completed: false
    });

    // Also notify backend
    fetch(`/api/tasks/${task.id}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: newDate, dueTime: customTime })
    }).catch(err => console.warn('[Routine Reschedule API] Warning:', err));
  };

  // Open Playbook modal for client
  const handleOpenPlaybookForClient = (client: Client, task?: Task) => {
    setPlaybookModalClient(client);
    setPlaybookModalTask(task || null);
    setIsPlaybookModalOpen(true);
  };

  // Open Next Step prompt
  const handleOpenNextStepPrompt = (client: Client, task: Task) => {
    setNextStepClient(client);
    setNextStepCompletedTask(task);
    setIsNextStepModalOpen(true);
  };

  // Smart prompt submission
  const handleSmartPromptSubmit = async () => {
    const text = smartPrompt.trim();
    if (!text) return;

    setIsCreatingWithAI(true);
    setSmartFeedback(null);

    try {
      let parsedTask = {
        clientId: undefined as string | undefined,
        clientName: undefined as string | undefined,
        actionType: 'WhatsApp',
        dueDate: todayStr,
        dueTime: '10:00' as string | undefined,
        priority: 'Média' as 'Alta' | 'Média' | 'Baixa',
        notes: text
      };

      // Match client name in text
      const lower = text.toLowerCase();
      for (const c of clients) {
        const firstName = c.name.split(' ')[0].toLowerCase();
        if (firstName.length > 2 && lower.includes(firstName)) {
          parsedTask.clientId = c.id;
          parsedTask.clientName = c.name;
          break;
        }
      }

      // Check action type
      if (lower.includes('ligar') || lower.includes('ligação') || lower.includes('telefone')) {
        parsedTask.actionType = 'Ligação';
      } else if (lower.includes('visita') || lower.includes('decorado') || lower.includes('plantão')) {
        parsedTask.actionType = 'Visita ao Imóvel';
      } else if (lower.includes('proposta') || lower.includes('simulação')) {
        parsedTask.actionType = 'Enviar Proposta';
      } else if (lower.includes('docs') || lower.includes('documento') || lower.includes('contrato')) {
        parsedTask.actionType = 'Contrato / Docs';
      }

      // Check date
      if (lower.includes('amanhã') || lower.includes('amanha')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        parsedTask.dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (lower.includes('depois de amanhã')) {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        parsedTask.dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      onAddTask({
        ...parsedTask,
        completed: false
      });

      setSmartPrompt('');
      setSmartFeedback(`✅ Tarefa criada com sucesso para ${parsedTask.dueDate}!`);
      setTimeout(() => setSmartFeedback(null), 6000);
    } catch (e) {
      console.warn('[SmartTask] Error:', e);
    } finally {
      setIsCreatingWithAI(false);
    }
  };

  // Manual task submission
  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDueDate) return;

    const matched = clients.find(c => c.id === formClientId);

    onAddTask({
      clientId: formClientId || undefined,
      clientName: matched ? matched.name : undefined,
      actionType: formActionType,
      dueDate: formDueDate,
      dueTime: formDueTime || undefined,
      priority: formPriority,
      notes: formNotes || undefined,
      completed: false
    });

    setIsAddingTask(false);
    setFormClientId('');
    setFormActionType('WhatsApp');
    setFormDueDate('');
    setFormNotes('');
  };

  // Activity counts calculation
  const activityCounts = useMemo(() => {
    const counts: Record<ActivityFilterType, number> = {
      'Todas': tasks.filter(t => !t.completed).length,
      'Primeiro Contato': 0,
      'Retorno/Follow-up': 0,
      'Visita': 0,
      'Documentação/Análise': 0
    };

    tasks.forEach(t => {
      if (t.completed) return;
      if (matchesActivityFilter(t, 'Primeiro Contato')) counts['Primeiro Contato']++;
      if (matchesActivityFilter(t, 'Retorno/Follow-up')) counts['Retorno/Follow-up']++;
      if (matchesActivityFilter(t, 'Visita')) counts['Visita']++;
      if (matchesActivityFilter(t, 'Documentação/Análise')) counts['Documentação/Análise']++;
    });

    return counts;
  }, [tasks, clients]);

  // Today Completion Rate
  const todayProgress = useMemo(() => {
    const allToday = tasks.filter(t => t.dueDate === todayStr);
    if (allToday.length === 0) return { total: 0, completed: 0, percentage: 100 };
    const comp = allToday.filter(t => t.completed).length;
    return {
      total: allToday.length,
      completed: comp,
      percentage: Math.round((comp / allToday.length) * 100)
    };
  }, [tasks, todayStr]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" id="my-routine-module">
      
      {/* 1. TOP HEADER & COCKPIT */}
      <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1D68FF]/15 text-[#38BDF8] border border-[#1D68FF]/30 uppercase tracking-wider">
                Central de Tarefas Ágil
              </span>
              <span className="text-xs text-[#8E9DB8] font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Minha Rotina & Meu Dia
            </h1>
            <p className="text-xs text-[#8E9DB8] mt-0.5">
              Gestão ágil de contatos, visitas e acompanhamento comercial integrado ao Playbook.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddingTask(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold text-xs shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Smart AI Prompt Input */}
        <div className="mt-4 pt-4 border-t border-[#16243F]">
          <div className="relative flex items-center">
            <Sparkles className="absolute left-3.5 h-4 w-4 text-[#00C7F2]" />
            <input
              type="text"
              value={smartPrompt}
              onChange={(e) => setSmartPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSmartPromptSubmit()}
              placeholder='Criar tarefa rápida com IA (ex: "Ligar para Carlos amanhã às 15h sobre a proposta")'
              className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] pl-10 pr-28 py-2.5 text-xs text-white placeholder-[#4B5A75] focus:outline-none focus:border-[#1D68FF]"
            />
            <button
              onClick={handleSmartPromptSubmit}
              disabled={isCreatingWithAI || !smartPrompt.trim()}
              className="absolute right-1.5 px-3 py-1.5 rounded-[8px] bg-[#101B30] hover:bg-[#16243F] text-xs font-semibold text-white border border-[#1E335A] transition-all cursor-pointer disabled:opacity-40"
            >
              {isCreatingWithAI ? 'Criando...' : 'Agendar'}
            </button>
          </div>
          {smartFeedback && (
            <p className="text-xs text-[#10B981] font-medium mt-1.5 pl-1">{smartFeedback}</p>
          )}
        </div>
      </div>

      {/* 2. ACTIVITY FILTER PILLS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1323] border border-[#16243F] rounded-[16px] p-3">
        {/* Quick Activity Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {ACTIVITY_FILTERS.map(f => {
            const Icon = f.icon;
            const isActive = activeActivityFilter === f.label;
            const count = activityCounts[f.label] || 0;

            return (
              <button
                key={f.label}
                onClick={() => setActiveActivityFilter(f.label)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1D68FF] text-white shadow-[0_0_12px_rgba(29,104,255,0.25)]'
                    : 'bg-[#080E1A] text-[#8E9DB8] hover:text-white hover:bg-[#101B30] border border-[#16243F]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[#00C7F2]'}`} />
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#101C33] text-[#38BDF8] border border-[#1E335A]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status toggles */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#4B5A75]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarefa ou lead..."
              className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#4B5A75] focus:outline-none focus:border-[#1D68FF]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-[#8E9DB8] hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Status selector */}
          <div className="flex items-center bg-[#080E1A] border border-[#16243F] rounded-[10px] p-0.5 text-[11px] font-semibold shrink-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                statusFilter === 'pending' ? 'bg-[#1D68FF]/20 text-[#38BDF8] font-bold' : 'text-[#8E9DB8] hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                statusFilter === 'completed' ? 'bg-[#10B981]/20 text-[#10B981] font-bold' : 'text-[#8E9DB8] hover:text-white'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#16243F] text-white font-bold' : 'text-[#8E9DB8] hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>
        </div>
      </div>

      {/* 3. OS 3 BLOCOS CLAROS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BLOCO 1: 🚨 ATRASADAS / CRÍTICAS */}
        <div className="space-y-4" id="block-overdue-critical">
          <div className="bg-[#0B1323] border border-[#EF4444]/30 rounded-[16px] p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Atrasadas & Críticas</h2>
                <p className="text-[10px] text-[#8E9DB8]">Tarefas vencidas e leads sem toque</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {overdueTasks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EF4444] text-white shadow-xs">
                  {overdueTasks.length}
                </span>
              )}
              {staleLeads.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 shadow-xs">
                  {staleLeads.length} estagnados
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Overdue tasks */}
            {overdueTasks.map(task => {
              const linked = clients.find(c => c.id === task.clientId);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  linkedClient={linked}
                  onToggleComplete={handleToggleComplete}
                  onDeleteTask={onDeleteTask}
                  onSelectClient={onSelectClient}
                  onOpenPlaybook={handleOpenPlaybookForClient}
                  onReschedule={handleReschedule}
                  onOpenNextStepPrompt={handleOpenNextStepPrompt}
                  isOverdue={true}
                />
              );
            })}

            {/* Stale Leads (>15 days without contact) */}
            {staleLeads.map(({ client, daysWithoutContact }) => (
              <StaleLeadCard
                key={client.id}
                client={client}
                daysWithoutContact={daysWithoutContact}
                onSelectClient={onSelectClient}
                onOpenPlaybook={handleOpenPlaybookForClient}
                onQuickScheduleTask={(c) => {
                  setFormClientId(c.id);
                  setFormDueDate(todayStr);
                  setFormActionType('WhatsApp');
                  setIsAddingTask(true);
                }}
              />
            ))}

            {overdueTasks.length === 0 && staleLeads.length === 0 && (
              <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2 opacity-80" />
                <h4 className="text-xs font-bold text-white">Nenhuma pendência crítica!</h4>
                <p className="text-[11px] text-[#8E9DB8] mt-0.5">Todas as tarefas e leads estão em dia.</p>
              </div>
            )}
          </div>
        </div>

        {/* BLOCO 2: 📅 AGENDA DE HOJE */}
        <div className="space-y-4" id="block-today-schedule">
          <div className="bg-[#0B1323] border border-[#1D68FF]/30 rounded-[16px] p-4 shadow-[0_0_12px_rgba(29,104,255,0.15)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#1D68FF]/15 border border-[#1D68FF]/30 flex items-center justify-center text-[#38BDF8]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Agenda de Hoje</h2>
                  <p className="text-[10px] text-[#8E9DB8]">Compromissos e retornos do dia</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1D68FF] text-white">
                {todayTasks.length}
              </span>
            </div>

            {/* Progress bar */}
            {todayProgress.total > 0 && (
              <div className="pt-2 border-t border-[#16243F] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#8E9DB8] font-semibold">
                  <span>Progresso do dia:</span>
                  <span className="text-[#38BDF8]">{todayProgress.completed} de {todayProgress.total} ({todayProgress.percentage}%)</span>
                </div>
                <div className="w-full bg-[#080E1A] h-1.5 rounded-full overflow-hidden border border-[#16243F]">
                  <div 
                    className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${todayProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {todayTasks.map(task => {
              const linked = clients.find(c => c.id === task.clientId);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  linkedClient={linked}
                  onToggleComplete={handleToggleComplete}
                  onDeleteTask={onDeleteTask}
                  onSelectClient={onSelectClient}
                  onOpenPlaybook={handleOpenPlaybookForClient}
                  onReschedule={handleReschedule}
                  onOpenNextStepPrompt={handleOpenNextStepPrompt}
                  isOverdue={false}
                />
              );
            })}

            {todayTasks.length === 0 && (
              <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-6 text-center space-y-3">
                <Calendar className="h-8 w-8 text-[#00C7F2] mx-auto opacity-70" />
                <div>
                  <h4 className="text-xs font-bold text-white">Nenhuma tarefa marcada para hoje</h4>
                  <p className="text-[11px] text-[#8E9DB8] mt-0.5">Agende contatos ou gere tarefas para os leads novos.</p>
                </div>
                <button
                  onClick={() => {
                    setFormDueDate(todayStr);
                    setIsAddingTask(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#101B30] hover:bg-[#16243F] text-xs font-semibold text-white border border-[#16243F] transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#00C7F2]" />
                  <span>Adicionar tarefa para hoje</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BLOCO 3: 🔜 PRÓXIMOS 7 DIAS */}
        <div className="space-y-4" id="block-upcoming-7days">
          <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#1D68FF]/15 border border-[#1D68FF]/30 flex items-center justify-center text-[#38BDF8]">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Próximos 7 Dias</h2>
                  <p className="text-[10px] text-[#8E9DB8]">Visão semanal de compromissos</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1D68FF]/20 text-[#38BDF8] border border-[#1D68FF]/30">
                {upcomingTasks.length}
              </span>
            </div>

            {/* 7 Days Timeline Tabs */}
            <div className="grid grid-cols-7 gap-1 pt-2 border-t border-[#16243F]">
              {next7DaysTimeline.map(d => {
                const isSelected = selectedDayTab === d.dateStr;
                const hasTasks = d.tasks.length > 0;

                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDayTab(isSelected ? null : d.dateStr)}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-[10px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D68FF] text-white font-bold shadow-[0_0_12px_rgba(29,104,255,0.25)]'
                        : hasTasks
                          ? 'bg-[#1D68FF]/15 text-[#38BDF8] border border-[#1D68FF]/30'
                          : 'bg-[#080E1A] text-[#8E9DB8] hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold">{d.weekDay}</span>
                    <span className="text-xs font-bold mt-0.5">{d.dayNumber}</span>
                    {hasTasks && (
                      <span className={`h-1 w-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[#00C7F2]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {/* If a day tab is selected, show only tasks for that day */}
            {(selectedDayTab 
              ? filteredTasks.filter(t => t.dueDate === selectedDayTab)
              : upcomingTasks
            ).map(task => {
              const linked = clients.find(c => c.id === task.clientId);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  linkedClient={linked}
                  onToggleComplete={handleToggleComplete}
                  onDeleteTask={onDeleteTask}
                  onSelectClient={onSelectClient}
                  onOpenPlaybook={handleOpenPlaybookForClient}
                  onReschedule={handleReschedule}
                  onOpenNextStepPrompt={handleOpenNextStepPrompt}
                  isOverdue={false}
                />
              );
            })}

            {upcomingTasks.length === 0 && !selectedDayTab && (
              <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-6 text-center">
                <CalendarDays className="h-8 w-8 text-[#00C7F2] mx-auto mb-2 opacity-70" />
                <h4 className="text-xs font-bold text-white">Sem compromissos futuros</h4>
                <p className="text-[11px] text-[#8E9DB8] mt-0.5">Use o funil ou a criação de tarefas para agendar follow-ups.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: MANUAL TASK CREATION */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-[#0B1323] border border-[#16243F] rounded-[16px] w-full max-w-lg overflow-hidden shadow-2xl"
              id="add-task-modal"
            >
              <div className="p-4 sm:p-5 border-b border-[#16243F] bg-[#080E1A] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-[#1D68FF]/15 border border-[#1D68FF]/30 flex items-center justify-center text-[#38BDF8]">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Nova Tarefa Comercial</h3>
                    <p className="text-xs text-[#8E9DB8]">Agende compromissos e follow-ups</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="p-1 rounded-[8px] text-[#8E9DB8] hover:text-white hover:bg-[#101B30] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleManualFormSubmit} className="p-4 sm:p-5 space-y-4">
                {/* Client Link Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">
                    Vincular a um Lead (Opcional):
                  </label>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                  >
                    <option value="">Nenhum (Tarefa Geral / Avulsa)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - {c.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Type & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">Tipo de Ação:</label>
                    <select
                      value={formActionType}
                      onChange={(e) => setFormActionType(e.target.value)}
                      className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                    >
                      {ACTION_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">Prioridade:</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                    >
                      <option value="Alta">🔥 Alta</option>
                      <option value="Média">⚡ Média</option>
                      <option value="Baixa">❄️ Baixa</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">Data:</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      required
                      className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">Horário (Opcional):</label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1D68FF]"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#4B5A75] font-bold uppercase">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => setFormDueDate(todayStr)}
                    className="px-2 py-0.5 rounded-[8px] bg-[#101B30] text-[10px] font-semibold text-[#8E9DB8] hover:text-white border border-[#1E335A]"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setFormDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                    }}
                    className="px-2 py-0.5 rounded-[8px] bg-[#101B30] text-[10px] font-semibold text-[#8E9DB8] hover:text-white border border-[#1E335A]"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 3);
                      setFormDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                    }}
                    className="px-2 py-0.5 rounded-[8px] bg-[#101B30] text-[10px] font-semibold text-[#8E9DB8] hover:text-white border border-[#1E335A]"
                  >
                    +3 dias
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8E9DB8] uppercase mb-1">Observações / Objetivo:</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    placeholder="Ex: Enviar tabela atualizada de valores e simulação Caixa..."
                    className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] p-3 text-xs text-white placeholder-[#4B5A75] focus:outline-none focus:border-[#1D68FF] resize-none"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[#16243F]">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 rounded-[10px] text-xs font-semibold text-[#8E9DB8] hover:text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!formDueDate}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] text-xs font-semibold bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Salvar Tarefa</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PLAYBOOK QUICK SCRIPT (WHATSAPP) */}
      <PlaybookQuickModal
        isOpen={isPlaybookModalOpen}
        onClose={() => setIsPlaybookModalOpen(false)}
        client={playbookModalClient || undefined}
        task={playbookModalTask || undefined}
      />

      {/* MODAL: NEXT STEP PROMPT */}
      <NextStepModal
        isOpen={isNextStepModalOpen}
        onClose={() => setIsNextStepModalOpen(false)}
        client={nextStepClient || undefined}
        completedTask={nextStepCompletedTask || undefined}
        onScheduleNextStep={(newTaskData) => {
          onAddTask(newTaskData);
          if (nextStepClient && onUpdateClient) {
            onUpdateClient({
              ...nextStepClient,
              nextContactDate: `${newTaskData.dueDate}T${newTaskData.dueTime || '10:00'}`
            });
          }
        }}
      />

    </div>
  );
}
