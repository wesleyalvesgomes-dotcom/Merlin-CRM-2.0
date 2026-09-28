import React, { useState, useRef, useEffect } from 'react';
import { Client, Sale, Task } from '../types';
import { EngineResult } from '../modules/rulesEngine/types';
import { openGoogleCalendarEvent } from '../lib/calendarUtils';
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageSquare, 
  User, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Brain,
  History as HistoryIcon,
  Lock,
  MessageCircle,
  Clock,
  Briefcase,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Trash2,
  ArrowRight,
  CalendarPlus,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getBrokerMemory, 
  getBrokerLearnedProfile, 
  addBrokerMemoryEntry,
  BrokerMemoryEntry,
  BrokerLearnedProfile,
  getGreeting
} from '../lib/storage';
import { useAuth } from '../modules/auth';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'merlin';
  text: string;
  timestamp: Date;
  action?: any;
}

interface MerlinChatProps {
  clients: Client[];
  tasks: Task[];
  sales: Sale[];
  engineResult?: EngineResult;
  compact?: boolean;
  onSelectClient?: (id: string) => void;
  onAddTask?: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTask?: (task: Task) => void;
}

export default function MerlinChat({
  clients,
  tasks,
  sales,
  engineResult,
  compact = false,
  onSelectClient,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onUpdateTask
}: MerlinChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [showMemory, setShowMemory] = useState(false);
  const [memoryEntries, setMemoryEntries] = useState<BrokerMemoryEntry[]>([]);
  const [learnedProfile, setLearnedProfile] = useState<BrokerLearnedProfile | null>(null);
  const [calendarToast, setCalendarToast] = useState<string | null>(null);

  // Reactive listener for loading Memory and Perfil Aprendido
  useEffect(() => {
    const loadMemory = () => {
      const mem = getBrokerMemory();
      setMemoryEntries(mem);
      setLearnedProfile(getBrokerLearnedProfile(mem, clients, sales));
    };

    loadMemory();

    window.addEventListener('merlin_memory_updated', loadMemory);
    return () => {
      window.removeEventListener('merlin_memory_updated', loadMemory);
    };
  }, [clients, sales]);

  // Initialize messages with an assistant greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      const highPriorityCount = engineResult?.priorities?.length || 0;
      const todayTasksCount = engineResult?.todayTasks?.length || 0;
      const overdueTasksCount = engineResult?.overdueTasks?.length || 0;
      const totalAlerts = (engineResult?.alerts?.length || 0);
      const greeting = getGreeting(user?.name || user?.email);

      let greetingText = `${greeting}! 👋 Eu sou o **Merlin**, seu Assistente Comercial Inteligente e Second Brain.\n\nAcabei de processar os dados da sua carteira de clientes usando o **Rules Engine** e identifiquei o seguinte status para hoje:\n`;

      if (highPriorityCount > 0) {
        greetingText += `🔥 **${highPriorityCount}** cliente${highPriorityCount > 1 ? 's com alta prioridade' : ' com alta prioridade'} precisando de contato urgente.\n`;
      }
      if (todayTasksCount > 0 || overdueTasksCount > 0) {
        greetingText += `📅 **${todayTasksCount + overdueTasksCount}** tarefa${(todayTasksCount + overdueTasksCount) > 1 ? 's comerciais pendentes' : ' comercial pendente'} para hoje.\n`;
      }
      if (totalAlerts > 0) {
        greetingText += `⚠️ **${totalAlerts}** alerta${totalAlerts > 1 ? 's de gargalo' : ' de gargalo'} na base (como leads estagnados ou sem retorno).\n`;
      }

      greetingText += `\nComo posso te ajudar agora? Você pode me pedir para:
- **"Cria uma tarefa para amanhã às 8:30 para eu fazer 20 retrabalhos."** (Crio direto na Minha Rotina!)
- **"Quais clientes devo chamar hoje?"** para ver as prioridades absolutas.
- **"Crie uma mensagem para [Nome do Cliente]"** para gerar uma abordagem personalizada de WhatsApp.
- **"Como está meu faturamento?"** para um resumo estratégico de suas comissões.`;

      setMessages([
        {
          id: 'welcome',
          sender: 'merlin',
          text: greetingText,
          timestamp: new Date()
        }
      ]);
    }
  }, [engineResult, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const mem = getBrokerMemory();
      const profile = getBrokerLearnedProfile(mem, clients, sales);

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text })),
          clients,
          tasks,
          sales,
          engineResult,
          brokerMemory: mem.slice(0, 15),
          brokerLearnedProfile: profile
        })
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (Código ${response.status})`);
      }

      const data = await response.json();
      const replyText = data.text || 'Desculpe, corretor, tive um problema ao processar sua solicitação.';
      const actionPayload = data.action || null;

      // Execute structured actions seamlessly
      if (actionPayload) {
        if (actionPayload.type === 'create_task' && actionPayload.task) {
          const t = actionPayload.task;
          const taskData = {
            clientId: t.clientId || undefined,
            clientName: t.clientName || undefined,
            actionType: t.actionType || 'Outro',
            dueDate: t.dueDate,
            dueTime: t.dueTime || undefined,
            priority: t.priority || 'Média',
            notes: t.notes || '',
            completed: false
          };

          if (onAddTask) {
            onAddTask(taskData);
          }
          window.dispatchEvent(new CustomEvent('merlin_create_task', { detail: taskData }));
          addBrokerMemoryEntry('task_created', `Merlin criou a tarefa "${taskData.notes}" para ${taskData.dueDate}${taskData.dueTime ? ' às ' + taskData.dueTime : ''}`, taskData.clientId, taskData.clientName);

          setCalendarToast('✅ Tarefa agendada no Merlin e salva automaticamente no Google Agenda!');
          setTimeout(() => {
            setCalendarToast(null);
          }, 6000);
        } else if (actionPayload.type === 'reschedule_task' && actionPayload.taskId) {
          const existing = tasks.find(t => t.id === actionPayload.taskId);
          if (existing) {
            const updatedTask: Task = {
              ...existing,
              dueDate: actionPayload.newDueDate || existing.dueDate,
              dueTime: actionPayload.newDueTime !== undefined ? actionPayload.newDueTime : existing.dueTime
            };
            if (onUpdateTask) {
              onUpdateTask(updatedTask);
            } else if (onDeleteTask && onAddTask) {
              onDeleteTask(existing.id);
              onAddTask({
                clientId: existing.clientId,
                clientName: existing.clientName,
                actionType: existing.actionType,
                dueDate: updatedTask.dueDate,
                dueTime: updatedTask.dueTime,
                priority: existing.priority,
                notes: existing.notes,
                completed: false
              });
            }
            window.dispatchEvent(new CustomEvent('merlin_update_task', { detail: updatedTask }));
            addBrokerMemoryEntry('task_rescheduled', `Merlin reagendou a tarefa "${existing.notes || existing.actionType}" para ${updatedTask.dueDate}${updatedTask.dueTime ? ' às ' + updatedTask.dueTime : ''}`, existing.clientId, existing.clientName);
          }
        } else if (actionPayload.type === 'complete_task' && actionPayload.taskId) {
          if (onToggleTaskComplete) {
            onToggleTaskComplete(actionPayload.taskId);
          }
          window.dispatchEvent(new CustomEvent('merlin_complete_task', { detail: { taskId: actionPayload.taskId } }));
          const completedTask = tasks.find(t => t.id === actionPayload.taskId);
          addBrokerMemoryEntry('task_completed', `Merlin concluiu a tarefa "${completedTask?.notes || actionPayload.taskId}"`, completedTask?.clientId, completedTask?.clientName);
        } else if (actionPayload.type === 'cancel_task' && actionPayload.taskId) {
          if (onDeleteTask) {
            onDeleteTask(actionPayload.taskId);
          }
          window.dispatchEvent(new CustomEvent('merlin_cancel_task', { detail: { taskId: actionPayload.taskId } }));
          addBrokerMemoryEntry('task_deleted', `Merlin removeu a tarefa "${actionPayload.taskId}"`);
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: `merlin-${Date.now()}`,
          sender: 'merlin',
          text: replyText,
          timestamp: new Date(),
          action: actionPayload
        }
      ]);

      // LOG TO MEMORY
      addBrokerMemoryEntry('message_generated', `Merlin gerou uma resposta/sugestão no chat: "${replyText.substring(0, 150)}..."`);
    } catch (error: any) {
      console.error('[MerlinChat] Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'merlin',
          text: `⚠️ **Ops, corretor!** Tive uma falha de conexão temporária ao consultar meu cérebro de IA: *${error.message || 'Verifique se o servidor está rodando.'}*\n\nTente novamente em alguns instantes.`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    // Clean markdown before copying if it has message markers
    const cleanText = text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // LOG TO MEMORY (mensagens utilizadas pelo corretor)
    addBrokerMemoryEntry('message_copied', `Corretor utilizou (copiou) a mensagem recomendada: "${cleanText.substring(0, 120)}..."`);
  };

  const parseBoldAndFormatting = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      
      // Simple list render
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bulletText = trimmed.substring(1).trim();
        return (
          <li key={lineIdx} className="ml-4 list-disc text-sm mb-1 leading-relaxed text-[#E5E5E5]">
            {formatInlineText(bulletText)}
          </li>
        );
      }
      
      // Simple headers
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-white mt-3 mb-1.5 font-display">
            {formatInlineText(trimmed.replace('###', '').trim())}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={lineIdx} className="text-base font-extrabold text-[#00C7F2] mt-4 mb-2 font-display">
            {formatInlineText(trimmed.replace('##', '').trim())}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={lineIdx} className="text-lg font-black text-white mt-5 mb-2.5 font-display">
            {formatInlineText(trimmed.replace('#', '').trim())}
          </h2>
        );
      }

      // Empty line
      if (trimmed === '') {
        return <div key={lineIdx} className="h-2" />;
      }

      // Paragraph
      return (
        <p key={lineIdx} className="text-sm text-[#E5E5E5] mb-2 leading-relaxed">
          {formatInlineText(trimmed)}
        </p>
      );
    });
  };

  const formatInlineText = (text: string) => {
    // Parse bold text **example**
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-white bg-[#101C33] px-1 py-0.2 rounded-md border border-[#1E335A]">{part}</strong>;
      }
      return part;
    });
  };

  const suggestionChips = [
    { label: '📅 Agendar 20 retrabalhos amanhã', text: 'Cria uma tarefa para amanhã às 8:30 para eu fazer 20 retrabalhos.' },
    { label: '🔥 Quem chamar hoje?', text: 'Merlin, quais clientes devo chamar hoje?' },
    { label: '📈 Análise da minha Carteira', text: 'Merlin, faça uma auditoria estratégica rápida na minha base de leads.' },
    { label: '💬 Mensagem para Franciene', text: 'Crie uma mensagem amigável para enviar para a Franciene agora.' },
    { label: '💡 Destravar leads frios', text: 'Me dê dicas e scripts táticos de como reativar leads que sumiram há semanas.' }
  ];

  return (
    <div className={`flex flex-col bg-[#0B1323] border border-[#16243F] rounded-[16px] overflow-hidden shadow-sm ${
      compact ? 'h-[440px] md:h-[480px]' : 'h-[640px] shadow-lg'
    }`} id="merlin-chat-container">
      {/* Header Banner */}
      <div className="bg-[#080E1A] px-4 py-3.5 border-b border-[#16243F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[10px] bg-[#1D68FF]/15 text-[#00C7F2] border border-[#1D68FF]/30">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-white tracking-tight font-display">
                Merlin Copiloto
              </h2>
              <span className="text-[9px] bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30 px-1.5 py-0.2 rounded-full uppercase font-black">
                IA Ativa
              </span>
            </div>
            <p className="text-[10px] text-[#8E9DB8]">
              Especialista em fechamentos imobiliários
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMemory(!showMemory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold border transition-all cursor-pointer ${
              showMemory
                ? 'bg-[#1D68FF] text-white border-transparent shadow-xs'
                : 'bg-[#0B1323] text-[#8E9DB8] border-[#16243F] hover:text-white hover:border-[#1D68FF]/40'
            }`}
            id="toggle-merlin-memory-btn"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>{showMemory ? 'Ver Chat' : 'Memória'}</span>
            {!showMemory && (
              <span className="bg-[#101C33] text-[#38BDF8] text-[9px] px-1.5 py-0.2 rounded-full border border-[#1E335A] font-mono font-black">
                {memoryEntries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Body Area: Messages or Broker Memory dashboard */}
      {showMemory ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#060A12] text-[#E5E5E5] p-4 space-y-4">
          {/* Top Banner explaining the feature */}
          <div className="bg-[#0B1323] border border-[#16243F] rounded-[14px] p-3.5 space-y-1.5 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#00C7F2] flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-[#00C7F2] animate-pulse" />
              Memória Ativa do Corretor
            </h3>
            <p className="text-xs text-[#8E9DB8] leading-relaxed">
              O Merlin aprende dinamicamente com as suas interações, contatos registrados, comentários e vendas. Esta memória é usada automaticamente para calibrar as abordagens ao seu estilo de negociação.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin scrollbar-thumb-[#16243F] scrollbar-track-transparent">
            {/* Learned Profile / Perfil de Comportamento */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[#8E9DB8] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#00C7F2]" />
                Perfil Aprendido de Vendas (Cérebro Merlin)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-[#0B1323] border border-[#16243F] rounded-[12px] p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#00C7F2] flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Estilo de Comunicação
                  </span>
                  <p className="text-xs text-[#E5E5E5] leading-relaxed">
                    {learnedProfile?.communicationStyle}
                  </p>
                </div>

                <div className="bg-[#0B1323] border border-[#16243F] rounded-[12px] p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#10B981] flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Forma de Abordagem
                  </span>
                  <p className="text-xs text-[#E5E5E5] leading-relaxed">
                    {learnedProfile?.approachStyle}
                  </p>
                </div>

                <div className="bg-[#0B1323] border border-[#16243F] rounded-[12px] p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#38BDF8] flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Preferências de Atendimento
                  </span>
                  <p className="text-xs text-[#E5E5E5] leading-relaxed">
                    {learnedProfile?.preferences}
                  </p>
                </div>

                <div className="bg-[#0B1323] border border-[#16243F] rounded-[12px] p-3 space-y-1 col-span-1 sm:col-span-2">
                  <span className="text-[9px] uppercase font-bold text-[#F59E0B] flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Padrões de Maiores Resultados
                  </span>
                  <p className="text-xs text-[#E5E5E5] leading-relaxed font-semibold">
                    {learnedProfile?.winningPatterns}
                  </p>
                </div>
              </div>
            </div>

            {/* Memorized Interactions Feed */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-[#8E9DB8] flex items-center gap-1.5">
                <HistoryIcon className="h-3.5 w-3.5 text-[#38BDF8]" />
                Interações Recentes Memorizadas ({memoryEntries.length})
              </h4>

              <div className="space-y-2">
                {memoryEntries.length === 0 ? (
                  <p className="text-xs text-[#4B5A75] text-center py-6">
                    Nenhuma interação memorizada ainda. Comece a usar o CRM!
                  </p>
                ) : (
                  memoryEntries.slice(0, 15).map((entry) => {
                    let badgeColor = "bg-[#101C33] text-[#8E9DB8] border-[#1E335A]";
                    let badgeText: string = entry.type;
                    if (entry.type === 'client_created') {
                      badgeColor = "bg-[#00C7F2]/12 text-[#00C7F2] border-[#00C7F2]/30";
                      badgeText = "Lead Novo";
                    } else if (entry.type === 'comment_added') {
                      badgeColor = "bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/30";
                      badgeText = "Observação";
                    } else if (entry.type === 'contact_registered') {
                      badgeColor = "bg-[#1D68FF]/15 text-[#00C7F2] border-[#1D68FF]/30";
                      badgeText = "Atendimento";
                    } else if (entry.type === 'status_changed') {
                      badgeColor = "bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/30";
                      badgeText = "Funil";
                    } else if (entry.type === 'sale_added') {
                      badgeColor = "bg-[#10B981]/12 text-[#10B981] border-[#10B981]/30";
                      badgeText = "Venda Won";
                    } else if (entry.type === 'task_completed') {
                      badgeColor = "bg-[#10B981]/12 text-[#10B981] border-[#10B981]/30";
                      badgeText = "Tarefa Done";
                    } else if (entry.type === 'message_copied') {
                      badgeColor = "bg-[#1D68FF]/15 text-[#00C7F2] border-[#1D68FF]/30";
                      badgeText = "Copiou Texto";
                    } else if (entry.type === 'message_generated') {
                      badgeColor = "bg-[#1D68FF]/15 text-[#00C7F2] border-[#1D68FF]/30";
                      badgeText = "IA Merlin";
                    }

                    return (
                      <div 
                        key={entry.id} 
                        className="bg-[#0B1323] border border-[#16243F] rounded-[12px] p-3 flex flex-col gap-1.5 hover:border-[#1D68FF]/40 transition-colors text-left"
                      >
                        <div className="flex items-center flex-wrap gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {badgeText}
                          </span>
                          {entry.clientName && (
                            <span className="text-[10px] font-bold text-white bg-[#080E1A] px-2 py-0.5 rounded-md border border-[#16243F]">
                              Lead: {entry.clientName}
                            </span>
                          )}
                          <span className="text-[9px] text-[#4B5A75] ml-auto">
                            {new Date(entry.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#8E9DB8] leading-relaxed font-medium">
                          {entry.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Privacy Banner */}
          <div className="pt-2 border-t border-[#16243F] flex items-center justify-between text-[10px] text-[#4B5A75] shrink-0">
            <span className="flex items-center gap-1 font-mono">
              <Lock className="h-3 w-3" />
              Sessão: Corretor Autônomo
            </span>
            <span>Memória local privativa</span>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Log area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#16243F] scrollbar-track-transparent bg-[#060A12]">
            {/* Realtime Calendar Notification Banner */}
            <AnimatePresence>
              {calendarToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] p-3 rounded-[12px] flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-500/10 mb-2"
                >
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4 text-[#10B981] shrink-0" />
                    <span>{calendarToast}</span>
                  </div>
                  <button 
                    onClick={() => setCalendarToast(null)} 
                    className="text-[#10B981] hover:text-white cursor-pointer ml-2"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Avatar Icon */}
                    <div className={`h-7 w-7 rounded-[10px] flex items-center justify-center shrink-0 border ${
                      isUser 
                        ? 'bg-[#1D68FF]/15 border-[#1D68FF]/30 text-[#00C7F2]' 
                        : 'bg-gradient-to-r from-[#1D68FF] to-[#0099FF] border-transparent text-white shadow-xs'
                    }`}>
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </div>

                    {/* Bubble card */}
                    <div className={`rounded-2xl p-3.5 relative group ${
                      isUser 
                        ? 'bg-[#1D68FF]/15 border border-[#1D68FF]/30 text-white rounded-tr-xs' 
                        : 'bg-[#0B1323] border border-[#16243F] text-[#E5E5E5] rounded-tl-xs shadow-xs'
                    }`}>
                      <div className="prose prose-invert max-w-none text-xs sm:text-sm space-y-1">
                        {parseBoldAndFormatting(msg.text)}
                      </div>

                      {/* Action Confirmation Card */}
                      {msg.action && (
                        <div className="mt-3 p-3 rounded-[12px] bg-[#080E1A] border border-[#16243F] space-y-2 text-left">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00C7F2]">
                            <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                            <span>
                              {msg.action.type === 'create_task' && 'Tarefa Adicionada à Minha Rotina'}
                              {msg.action.type === 'reschedule_task' && 'Tarefa Reagendada'}
                              {msg.action.type === 'complete_task' && 'Tarefa Concluída com Sucesso'}
                              {msg.action.type === 'cancel_task' && 'Tarefa Cancelada'}
                            </span>
                          </div>
                          
                          {msg.action.type === 'create_task' && msg.action.task && (
                            <div className="text-xs text-[#E5E5E5] space-y-1 pl-5">
                              <p className="font-semibold text-white">
                                {msg.action.task.notes || msg.action.task.actionType}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8E9DB8]">
                                <span className="flex items-center gap-1 bg-[#0B1323] px-2 py-0.5 rounded-md border border-[#16243F]">
                                  <Calendar className="h-3 w-3 text-[#00C7F2]" />
                                  {msg.action.task.dueDate}
                                </span>
                                {msg.action.task.dueTime && (
                                  <span className="flex items-center gap-1 bg-[#0B1323] px-2 py-0.5 rounded-md border border-[#16243F]">
                                    <Clock className="h-3 w-3 text-[#38BDF8]" />
                                    {msg.action.task.dueTime}
                                  </span>
                                )}
                                {msg.action.task.clientName && (
                                  <span className="bg-[#0B1323] px-2 py-0.5 rounded-md border border-[#16243F] text-white">
                                    Lead: {msg.action.task.clientName}
                                  </span>
                                )}
                                <span className="bg-[#1D68FF]/15 text-[#00C7F2] px-2 py-0.5 rounded-md text-[9px] font-bold border border-[#1D68FF]/30">
                                  {msg.action.task.actionType}
                                </span>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => openGoogleCalendarEvent({
                                    title: msg.action.task.notes || `${msg.action.task.actionType} - ${msg.action.task.clientName || 'Cliente'}`,
                                    notes: `Tarefa: ${msg.action.task.notes || msg.action.task.actionType}\nLead: ${msg.action.task.clientName || 'N/A'}\nPrioridade: ${msg.action.task.priority}`,
                                    dueDate: msg.action.task.dueDate,
                                    dueTime: msg.action.task.dueTime
                                  })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-[#1D68FF]/15 text-[#00C7F2] hover:bg-[#1D68FF]/25 border border-[#1D68FF]/30 text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  <CalendarPlus className="h-3.5 w-3.5" />
                                  <span>Abrir no Google Agenda</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.action.type === 'reschedule_task' && (
                            <div className="text-xs text-[#E5E5E5] space-y-1 pl-5">
                              <p className="text-[11px] text-[#8E9DB8]">
                                Nova data: <strong className="text-white">{msg.action.newDueDate}</strong>
                                {msg.action.newDueTime && <> às <strong className="text-white">{msg.action.newDueTime}</strong></>}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Message Utility Bar */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#16243F] text-[10px] text-[#4B5A75]">
                        <span>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {!isUser && (
                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="flex items-center gap-1 text-[#8E9DB8] hover:text-[#00C7F2] bg-[#080E1A] border border-[#16243F] px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                            title="Copiar texto limpo"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-[#10B981]" />
                                <span className="text-[#10B981] font-bold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {isTyping && (
              <div className="flex gap-2.5 mr-auto max-w-[88%]">
                <div className="h-7 w-7 rounded-[10px] bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="bg-[#0B1323] border border-[#16243F] rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-2">
                  <span className="text-xs text-[#8E9DB8] font-medium animate-pulse">
                    Merlin está analisando seu CRM e formulando a estratégia...
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C7F2] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C7F2] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C7F2] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Quick Chips */}
          <div className="px-3.5 py-2 bg-[#080E1A] border-t border-[#16243F] flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                disabled={isTyping}
                className="shrink-0 text-left px-3 py-1.5 bg-[#0B1323] hover:bg-[#101B30] border border-[#16243F] text-[#8E9DB8] hover:text-[#00C7F2] rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:border-[#1D68FF]/40"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 bg-[#080E1A] border-t border-[#16243F] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isTyping ? 'Aguarde o Merlin responder...' : 'Pergunte sobre clientes ou peça scripts de WhatsApp...'}
              disabled={isTyping}
              className="flex-1 bg-[#0B1323] border border-[#16243F] text-white placeholder-[#4B5A75] rounded-[10px] px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-10 w-10 bg-gradient-to-r from-[#1D68FF] to-[#0099FF] disabled:bg-[#101C33] disabled:text-[#4B5A75] text-white rounded-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 shadow-md shadow-blue-500/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
