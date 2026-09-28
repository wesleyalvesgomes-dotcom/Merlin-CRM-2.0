import React, { useState } from 'react';
import { ClientStatus, Tag } from '../types';
import { X, UserPlus, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface AddClientModalProps {
  tags: Tag[];
  initialStatus?: ClientStatus;
  onClose: () => void;
  onSave: (clientData: {
    name: string;
    phone: string;
    notes: string;
    status: ClientStatus;
    tags: string[];
    email?: string;
    empreendimento?: string;
    origem?: string;
  }) => void;
}

export default function AddClientModal({
  tags,
  initialStatus = 'Lead Novo',
  onClose,
  onSave
}: AddClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ClientStatus>(initialStatus);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [empreendimento, setEmpreendimento] = useState('');
  const [origem, setOrigem] = useState('');

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Por favor, preencha o Nome e Telefone do cliente.');
      return;
    }

    onSave({
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      status,
      tags: selectedTags,
      email: email.trim() || undefined,
      empreendimento: empreendimento.trim() || undefined,
      origem: origem.trim() || undefined
    });
  };

  const STATUS_LIST: ClientStatus[] = [
    'Lead Novo',
    'Contato',
    'Em Atendimento',
    'Retrabalho',
    'Agendado',
    'Visitou',
    'Proposta',
    'Documentação',
    'Venda Fechada',
    'Perdido'
  ];

  return (
    <div 
      className="fixed inset-0 bg-[#060A12]/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all"
      onClick={onClose}
      id="add-client-modal-backdrop"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-xl bg-[#0B1323] rounded-t-[20px] sm:rounded-[16px] shadow-2xl relative overflow-hidden border border-[#16243F] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="add-client-modal-body"
      >
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 sm:hidden flex justify-center bg-[#080E1A]">
          <div className="w-12 h-1.5 bg-[#1E335A] rounded-full" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#16243F] bg-[#080E1A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1D68FF]/15 text-[#00C7F2] rounded-[10px] border border-[#1D68FF]/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-white">
                Cadastrar Novo Cliente
              </h3>
              <p className="text-xs text-[#8E9DB8]">
                Adicione as informações essenciais para acompanhamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9DB8] hover:text-white hover:bg-[#101B30] rounded-[10px] cursor-pointer transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Nome do Cliente *</label>
              <input
                type="text"
                placeholder="Ex: Roberto Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
                required
                autoFocus
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Telefone / WhatsApp *</label>
              <input
                type="text"
                placeholder="Ex: (11) 98123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Email</label>
              <input
                type="email"
                placeholder="Ex: roberto@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
              />
            </div>

            {/* Imovel / Empreendimento */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Imóvel / Interesse</label>
              <input
                type="text"
                placeholder="Ex: Apto 3 dorms, Casa Jardins..."
                value={empreendimento}
                onChange={(e) => setEmpreendimento(e.target.value)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Etapa Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
              >
                {STATUS_LIST.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Origem */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Origem do Lead</label>
              <input
                type="text"
                placeholder="Ex: Instagram, Placa, Indicação"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Perfil &amp; Observações Iniciais</label>
            <textarea
              placeholder="Ex: Busca casa de R$ 900k em condomínio fechado. Perfil investidor..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
            />
          </div>

          {/* Quick initial tags selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">Etiquetas Rápidas</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2.5 border border-[#16243F] rounded-[10px] bg-[#080E1A]">
              {tags.map(tag => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.name)}
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? `${tag.color} ring-2 ring-[#1D68FF]/30 font-bold shadow-2xs`
                        : 'bg-[#101C33] text-[#8E9DB8] border-[#16243F] hover:border-[#1D68FF]/50'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-2 justify-end pt-3 border-t border-[#16243F]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#8E9DB8] font-semibold px-4 py-2 border border-[#16243F] rounded-[10px] hover:bg-[#101B30] hover:text-white transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold px-4 py-2 rounded-[10px] flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 hover:brightness-110"
            >
              <Save className="h-4 w-4" />
              <span>Cadastrar Cliente</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
