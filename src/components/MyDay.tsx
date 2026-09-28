import React, { useState } from 'react';
import { Client, Tag, Sale, Task } from '../types';
import { getClientAlerts, getDaysSinceContact, isToday, getGreeting } from '../lib/storage';
import { useAuth } from '../modules/auth';
import { 
  Sparkles, 
  Flame, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  PhoneCall, 
  MessageSquare, 
  UserCheck, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  CheckSquare, 
  Users, 
  Target, 
  ArrowUpRight,
  Zap,
  Snowflake,
  Brain,
  RotateCcw,
  UserPlus,
  Send,
  CalendarPlus
} from 'lucide-react';
import { EngineResult } from '../modules/rulesEngine/types';
import PlaybookQuickModal from './routine/PlaybookQuickModal';
import NextStepModal from './routine/NextStepModal';

interface MyDayProps {
  clients: Client[];
  tags: Tag[];
  sales: Sale[];
  tasks: Task[];
  engineResult?: EngineResult;
  onSelectClient: (id: string) => void;
  onQuickContact: (id: string) => void;
  onQuickReschedule: (id: string, dateStr: string) => void;
  onNavigateToClientsWithFilter?: (filterType: 'high_priority' | 'no_next_contact') => void;
  onNavigateToTasksWithFilter?: (todayOnly: boolean) => void;
  onNavigateToTab?: (tab: string) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onOpenAddClient?: () => void;
}

export default function MyDay({
  clients,
  tags,
  sales,
  tasks,
  engineResult,
  onSelectClient,
  onQuickContact,
  onQuickReschedule,
  onNavigateToClientsWithFilter,
  onNavigateToTasksWithFilter,
  onNavigateToTab,
  onAddTask,
  onOpenAddClient
}: MyDayProps) {
  const { user } = useAuth();
  const dynamicGreeting = getGreeting(user?.name || user?.email);

  // Playbook & Next Step modal states
  const [playbookClient, setPlaybookClient] = useState<Client | null>(null);
  const [nextStepClient, setNextStepClient] = useState<Client | null>(null);

  // 1. CRM Data Summaries
  const todayClients = clients.filter(c => {
    return isToday(c.nextContactDate) && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  const overdueClients = clients.filter(c => {
    const alerts = getClientAlerts(c);
    return alerts.isAtrasado && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  const newLeads = clients.filter(c => c.status === 'Lead Novo');

  // Stale leads without contact for > 15 days
  const staleLeads = clients.filter(c => {
    const days = getDaysSinceContact(c);
    return days >= 15 && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  // High priority clients from Rules Engine or fallback
  const enginePriorityClients = engineResult?.priorities && engineResult.priorities.length > 0
    ? engineResult.priorities
        .map(p => clients.find(c => c.id === p.clientId))
        .filter((c): c is Client => Boolean(c))
    : [];

  const highPriorityClients = enginePriorityClients.length > 0
    ? enginePriorityClients
    : clients.filter(c => {
        const alerts = getClientAlerts(c);
        return alerts.isUrgente && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
      });

  const highPriorityCount = highPriorityClients.length;

  const noNextContactClients = clients.filter(c => {
    return !c.nextContactDate && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });
  const noNextContactCount = noNextContactClients.length;

  const todayTasks = tasks.filter(t => isToday(t.dueDate) && !t.completed);
  const finalTasksCount = (engineResult?.todayTasks?.length || 0) + (engineResult?.overdueTasks?.length || 0) || (todayClients.length + overdueClients.length + todayTasks.length);

  // Immediate Action Items
  const urgentActionClients = highPriorityClients.slice(0, 5);

  // Today's due contacts
  const todayDueContacts = todayClients.slice(0, 5);

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  // Helper for lead temperature
  const getLeadTemp = (client: Client) => {
    const urgency = typeof client.secondBrainSummary === 'object' && client.secondBrainSummary !== null
      ? client.secondBrainSummary.urgencyLevel
      : undefined;

    if (urgency === 'Alta' || client.status === 'Proposta' || client.status === 'Agendado' || client.status === 'Visitou') {
      return { label: 'Quente', icon: Flame, color: 'text-[#EF4444] bg-[#EF4444]/12 border-[#EF4444]/25' };
    }
    if (urgency === 'Média' || client.status === 'Em Atendimento' || client.status === 'Contato') {
      return { label: 'Morno', icon: Zap, color: 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25' };
    }
    return { label: 'Frio', icon: Snowflake, color: 'text-[#00C7F2] bg-[#00C7F2]/12 border-[#00C7F2]/25' };
  };

  return (
    <div className="space-y-5 pb-10" id="my-day-panel">
      
      {/* 1. TOP SUMMARY CARD (CYBER SLATE / DEEP BLUE COCKPIT) */}
      <div className="merlin-card p-4 sm:p-7 relative overflow-hidden bg-[#0B1323] border border-[#16243F] shadow-xl rounded-2xl">
        {/* Subtle geometric light accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#1D68FF]/15 via-[#0099FF]/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#1D68FF]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#101C33] text-[#38BDF8] border border-[#1E335A] text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-[#38BDF8]" />
                <span>Cockpit Merlin &bull; SuperApp</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold font-display tracking-tight text-white">
                {dynamicGreeting} 👋
              </h1>
              <p className="text-xs text-[#8E9DB8] font-medium capitalize">
                {currentDateFormatted}
              </p>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#101C33] border border-[#1E335A] text-xs font-semibold text-[#8E9DB8]">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>Carteira Ativa ({clients.filter(c => c.status !== 'Venda Fechada' && c.status !== 'Perdido').length})</span>
              </div>
            </div>
          </div>

          {/* Quick Stat Chips / Urgency Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-[#16243F]">
            {/* Chip 1: Leads Quentes */}
            <button
              onClick={() => onNavigateToClientsWithFilter?.('high_priority')}
              className="p-2.5 sm:p-3.5 rounded-xl bg-[#0B1323] border border-[#16243F] hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-98 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-[#EF4444] uppercase tracking-wider flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />
                  <span className="hidden sm:inline">Leads</span> Quentes
                </span>
                <span className="text-base sm:text-xl font-bold font-display text-[#EF4444]">
                  {highPriorityCount}
                </span>
              </div>
              <p className="text-[10px] text-[#8E9DB8] mt-1 hidden sm:block truncate">
                Risco de esfriar
              </p>
            </button>

            {/* Chip 2: Agenda de Hoje */}
            <button
              onClick={() => onNavigateToTasksWithFilter?.(true)}
              className="p-2.5 sm:p-3.5 rounded-xl bg-[#0B1323] border border-[#16243F] hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-98 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                  Hoje
                </span>
                <span className="text-base sm:text-xl font-bold font-display text-[#38BDF8]">
                  {finalTasksCount}
                </span>
              </div>
              <p className="text-[10px] text-[#8E9DB8] mt-1 hidden sm:block truncate">
                Tarefas e visitas
              </p>
            </button>

            {/* Chip 3: Sem Retorno */}
            <button
              onClick={() => onNavigateToClientsWithFilter?.('no_next_contact')}
              className="p-2.5 sm:p-3.5 rounded-xl bg-[#0B1323] border border-[#16243F] hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-98 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                  Atrasados
                </span>
                <span className="text-base sm:text-xl font-bold font-display text-[#F59E0B]">
                  {noNextContactCount}
                </span>
              </div>
              <p className="text-[10px] text-[#8E9DB8] mt-1 hidden sm:block truncate">
                Sem próximo contato
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* 2. UNIFICAÇÃO DOS ATALHOS RÁPIDOS */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8E9DB8] flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#00C7F2]" />
            <span>Atalhos de Alta Velocidade</span>
          </h2>
          <span className="text-[11px] text-[#4B5A75] font-medium">Toque rápido</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Shortcut 1: Primeiro Contato */}
          <button
            id="quick-action-primeiro-contato"
            onClick={() => {
              if (newLeads.length > 0) {
                setPlaybookClient(newLeads[0]);
              } else if (onNavigateToTab) {
                onNavigateToTab('funil');
              }
            }}
            className="p-3.5 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] hover:border-[#1D68FF] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-97 transition-all text-left group cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#1D68FF]/12 text-[#00C7F2] font-black flex items-center justify-center">
                <Target className="h-5 w-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#101C33] border border-[#1E335A] text-[#38BDF8]">
                {newLeads.length} novos
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00C7F2] transition-colors leading-tight">
                Primeiro Contato
              </h3>
              <p className="text-[10px] text-[#8E9DB8] truncate">
                Disparar abordagem rápida
              </p>
            </div>
          </button>

          {/* Shortcut 2: Resgatar Leads */}
          <button
            id="quick-action-resgatar-leads"
            onClick={() => {
              if (staleLeads.length > 0) {
                setPlaybookClient(staleLeads[0]);
              } else {
                onNavigateToClientsWithFilter?.('high_priority');
              }
            }}
            className="p-3.5 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] hover:border-[#1D68FF] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-97 transition-all text-left group cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#1D68FF]/12 text-[#00C7F2] flex items-center justify-center">
                <RotateCcw className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#101C33] border border-[#1E335A] text-[#38BDF8]">
                {staleLeads.length} parados
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00C7F2] transition-colors leading-tight">
                Resgatar Leads
              </h3>
              <p className="text-[10px] text-[#8E9DB8] truncate">
                Reativar via Playbook
              </p>
            </div>
          </button>

          {/* Shortcut 3: Agenda de Hoje */}
          <button
            id="quick-action-agenda-hoje"
            onClick={() => onNavigateToTasksWithFilter?.(true)}
            className="p-3.5 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] hover:border-[#1D68FF] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-97 transition-all text-left group cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#1D68FF]/12 text-[#00C7F2] flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#101C33] border border-[#1E335A] text-[#38BDF8]">
                {finalTasksCount} hoje
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00C7F2] transition-colors leading-tight">
                Agenda de Hoje
              </h3>
              <p className="text-[10px] text-[#8E9DB8] truncate">
                Retornos e visitas
              </p>
            </div>
          </button>

          {/* Shortcut 4: Segundo Cérebro */}
          <button
            id="quick-action-segundo-cerebro"
            onClick={() => {
              if (onNavigateToTab) {
                onNavigateToTab('intelligence');
              }
            }}
            className="p-3.5 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] hover:border-[#1D68FF] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] active:scale-97 transition-all text-left group cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#1D68FF]/12 text-[#00C7F2] flex items-center justify-center">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#101C33] border border-[#1E335A] text-[#38BDF8]">
                IA 24h
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00C7F2] transition-colors leading-tight">
                Segundo Cérebro
              </h3>
              <p className="text-[10px] text-[#8E9DB8] truncate">
                Copiloto comercial
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. DUAL-COLUMN COCKPIT FEED: LEADS QUENTES & AGENDA DE HOJE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column 1: AÇÕES IMEDIATAS & LEADS QUENTES */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#EF4444]" />
              <span>Prioridade Alta / Quentes</span>
            </h2>
            <button
              onClick={() => onNavigateToClientsWithFilter?.('high_priority')}
              className="text-xs font-semibold text-[#00C7F2] hover:text-[#38BDF8] cursor-pointer flex items-center gap-1"
            >
              <span>Ver todos ({highPriorityCount})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {urgentActionClients.length > 0 ? (
            <div className="space-y-3">
              {urgentActionClients.map((client) => {
                const days = getDaysSinceContact(client);
                const temp = getLeadTemp(client);
                const TempIcon = temp.icon;

                return (
                  <div
                    key={client.id}
                    className="p-4 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all flex flex-col gap-3 group shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onSelectClient(client.id)}
                            className="font-bold text-sm text-white hover:text-[#00C7F2] text-left transition-colors cursor-pointer"
                          >
                            {client.name}
                          </button>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${temp.color}`}>
                            <TempIcon className="h-3 w-3" />
                            <span>{temp.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#8E9DB8] mt-1">
                          {client.empreendimento || 'Sem empreendimento especificado'} &bull; <span className="text-white font-medium">{client.status}</span>
                        </p>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/25 shrink-0">
                        {days}d sem contato
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#16243F]">
                      {/* Direct WhatsApp with Playbook */}
                      <button
                        onClick={() => setPlaybookClient(client)}
                        className="flex-1 py-2 px-3 rounded-[10px] bg-emerald-500/12 hover:bg-emerald-500/20 text-[#10B981] border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp (Playbook)</span>
                      </button>

                      {/* Client Card */}
                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="py-2 px-3.5 rounded-[10px] bg-[#101C33] hover:bg-[#16243F] text-[#8E9DB8] hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#16243F] active:scale-98"
                      >
                        <span>Ficha</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#4B5A75]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl text-center space-y-2 bg-[#0B1323] border border-[#16243F]">
              <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto" />
              <h3 className="text-sm font-bold text-white">
                Nenhum lead com alta prioridade pendente!
              </h3>
              <p className="text-xs text-[#8E9DB8]">
                Sua carteira está sob controle. Aproveite para fazer novos contatos.
              </p>
            </div>
          )}
        </div>

        {/* Column 2: RETORNOS E AGENDA DE HOJE */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#00C7F2]" />
              <span>Contatos & Retornos Agendados</span>
            </h2>
            <button
              onClick={() => onNavigateToTasksWithFilter?.(true)}
              className="text-xs font-semibold text-[#00C7F2] hover:text-[#38BDF8] cursor-pointer flex items-center gap-1"
            >
              <span>Ver Rotina Completa</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todayDueContacts.length > 0 ? (
            <div className="space-y-3">
              {todayDueContacts.map((client) => {
                const temp = getLeadTemp(client);
                const TempIcon = temp.icon;

                return (
                  <div
                    key={client.id}
                    className="p-4 rounded-2xl bg-[#0B1323] border border-[#16243F] hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all flex flex-col gap-3 group shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onSelectClient(client.id)}
                            className="font-bold text-sm text-white hover:text-[#00C7F2] text-left transition-colors cursor-pointer"
                          >
                            {client.name}
                          </button>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${temp.color}`}>
                            <TempIcon className="h-3 w-3" />
                            <span>{temp.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#8E9DB8] mt-1">
                          Status: <span className="text-white font-medium">{client.status}</span>
                        </p>
                      </div>

                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#101C33] border border-[#1E335A] text-[#38BDF8] shrink-0">
                        Hoje
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#16243F]">
                      {/* Playbook Button */}
                      <button
                        onClick={() => setPlaybookClient(client)}
                        className="flex-1 py-2 px-3 rounded-[10px] bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98 shadow-sm shadow-blue-500/20"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp (Script)</span>
                      </button>

                      {/* Complete & Next Step */}
                      <button
                        onClick={() => {
                          onQuickContact(client.id);
                          setNextStepClient(client);
                        }}
                        className="py-2 px-3 rounded-[10px] bg-[#101C33] hover:bg-[#16243F] text-[#10B981] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#16243F] active:scale-98"
                        title="Concluir contato e agendar próximo passo"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        <span className="hidden sm:inline">Concluir</span>
                      </button>

                      {/* Client Card */}
                      <button
                        onClick={() => onSelectClient(client.id)}
                        className="py-2 px-3 rounded-[10px] bg-[#101C33] hover:bg-[#16243F] text-[#8E9DB8] hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#16243F] active:scale-98"
                      >
                        <span>Ficha</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl text-center space-y-2 bg-[#0B1323] border border-[#16243F]">
              <Calendar className="h-8 w-8 text-[#00C7F2]/60 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                Nenhum retorno pendente para hoje
              </h3>
              <p className="text-xs text-[#8E9DB8]">
                Todos os contatos agendados para hoje estão em dia.
              </p>
            </div>
          )}

          {/* Quick summary box */}
          <div className="p-3.5 rounded-2xl bg-[#0B1323] border border-[#16243F] text-[#8E9DB8] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Target className="h-4 w-4 text-[#00C7F2] shrink-0" />
              <span className="font-medium text-[#8E9DB8]">Clientes ativos em carteira:</span>
            </div>
            <span className="font-bold text-[#00C7F2] text-sm font-mono">
              {clients.filter(c => c.status !== 'Venda Fechada' && c.status !== 'Perdido').length}
            </span>
          </div>
        </div>

      </div>

      {/* PLAYBOOK QUICK SCRIPT MODAL (BOTTOM SHEET ON MOBILE) */}
      {playbookClient && (
        <PlaybookQuickModal
          isOpen={Boolean(playbookClient)}
          onClose={() => setPlaybookClient(null)}
          client={playbookClient}
        />
      )}

      {/* NEXT STEP MODAL (BOTTOM SHEET ON MOBILE) */}
      {nextStepClient && onAddTask && (
        <NextStepModal
          isOpen={Boolean(nextStepClient)}
          onClose={() => setNextStepClient(null)}
          client={nextStepClient}
          onScheduleNextStep={onAddTask}
        />
      )}

    </div>
  );
}
