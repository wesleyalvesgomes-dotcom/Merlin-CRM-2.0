import React from 'react';
import { Client, Task } from '../../types';
import { 
  AlertTriangle, 
  MessageSquare, 
  Plus, 
  User, 
  Phone, 
  Building, 
  Clock, 
  ArrowRight,
  Flame,
  Zap,
  Snowflake
} from 'lucide-react';
import { motion } from 'motion/react';

interface StaleLeadCardProps {
  client: Client;
  daysWithoutContact: number;
  onSelectClient: (clientId: string) => void;
  onOpenPlaybook: (client: Client, task?: Task) => void;
  onQuickScheduleTask: (client: Client) => void;
}

export default function StaleLeadCard({
  client,
  daysWithoutContact,
  onSelectClient,
  onOpenPlaybook,
  onQuickScheduleTask
}: StaleLeadCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#0B1323] border border-[#EF4444]/30 hover:border-[#EF4444]/60 rounded-[16px] p-3.5 shadow-sm transition-all flex flex-col justify-between group"
      id={`stale-lead-${client.id}`}
    >
      <div className="space-y-2.5">
        {/* Top bar: Alert Badge + Days Count */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse">
            <AlertTriangle className="h-3 w-3 text-[#EF4444]" />
            <span>Lead Estagnado</span>
          </span>

          <span className="text-[11px] font-mono font-bold text-[#EF4444]">
            {daysWithoutContact} dias sem toque
          </span>
        </div>

        {/* Client Name & Phone */}
        <div>
          <button
            onClick={() => onSelectClient(client.id)}
            className="text-sm font-bold text-white hover:text-[#00C7F2] flex items-center gap-1.5 transition-colors cursor-pointer text-left"
          >
            <User className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span className="truncate">{client.name}</span>
          </button>
          
          <div className="flex items-center gap-2 text-[11px] text-[#8E9DB8] mt-0.5">
            {client.phone && <span>{client.phone}</span>}
            {client.empreendimento && (
              <>
                <span className="text-[#4B5A75]">•</span>
                <span className="truncate max-w-[140px] text-white">{client.empreendimento}</span>
              </>
            )}
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#4B5A75] font-bold uppercase">Status:</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#101C33] text-[#38BDF8] border border-[#1E335A]">
            {client.status}
          </span>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="pt-3 mt-3 border-t border-[#16243F] flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenPlaybook(client)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-semibold bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 border border-[#10B981]/40 transition-all cursor-pointer active:scale-95"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Reativar (Whats)</span>
        </button>

        <button
          onClick={() => onQuickScheduleTask(client)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-[10px] text-xs font-semibold bg-[#101B30] hover:bg-[#16243F] text-white border border-[#16243F] transition-all cursor-pointer active:scale-95"
          title="Agendar nova tarefa para este lead"
        >
          <Plus className="h-3.5 w-3.5 text-[#38BDF8]" />
          <span>Agendar</span>
        </button>
      </div>
    </motion.div>
  );
}
