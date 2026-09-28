import React, { useState, useMemo, useRef } from 'react';
import { Client, Tag, ClientStatus } from '../types';
import { getClientAlerts, getDaysSinceContact } from '../lib/storage';
import { 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Tag as TagIcon, 
  Filter, 
  Trash2, 
  AlertTriangle,
  FolderMinus,
  Edit2,
  Upload,
  Download,
  Check,
  AlertCircle,
  FileSpreadsheet,
  X,
  LayoutGrid,
  List,
  Sparkles,
  ChevronRight,
  Clock,
  UserCheck,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface ImportedRow {
  name: string;
  phone: string;
  email?: string;
  empreendimento?: string;
  origem?: string;
  status: ClientStatus;
  notes: string;
  valid: boolean;
}

interface ClientDirectoryProps {
  clients: Client[];
  tags: Tag[];
  onSelectClient: (id: string) => void;
  onAddClient: () => void;
  onDeleteClient: (id: string) => void;
  onCreateTag: (name: string, color: string) => void;
  onImportClients: (importedList: {
    name: string;
    phone: string;
    email?: string;
    empreendimento?: string;
    origem?: string;
    status: ClientStatus;
    notes: string;
  }[]) => void;
  initialSpecialFilter?: 'all' | 'high_priority' | 'no_next_contact';
  onSpecialFilterChange?: (filter: 'all' | 'high_priority' | 'no_next_contact') => void;
}

export default function ClientDirectory({
  clients,
  tags,
  onSelectClient,
  onAddClient,
  onDeleteClient,
  onCreateTag,
  onImportClients,
  initialSpecialFilter = 'all',
  onSpecialFilterChange
}: ClientDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSpecialFilter, setSelectedSpecialFilter] = useState<'all' | 'high_priority' | 'no_next_contact'>(initialSpecialFilter);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800');

  // Sync initialSpecialFilter prop
  React.useEffect(() => {
    setSelectedSpecialFilter(initialSpecialFilter);
  }, [initialSpecialFilter]);

  const handleSpecialFilterChange = (val: 'all' | 'high_priority' | 'no_next_contact') => {
    setSelectedSpecialFilter(val);
    if (onSpecialFilterChange) {
      onSpecialFilterChange(val);
    }
  };

  // Excel Import / Export States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp-style soft colors list for selection
  const TAG_COLOR_PRESETS = [
    { name: 'Ciano / Destaque', value: 'bg-[#00C7F2]/15 text-[#00C7F2] border-[#00C7F2]/40' },
    { name: 'Azul Real / VIP', value: 'bg-[#1D68FF]/15 text-[#38BDF8] border-[#1D68FF]/40' },
    { name: 'Esmeralda / Ativo', value: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40' },
    { name: 'Cyber Slate / Neutro', value: 'bg-[#101C33] text-[#8E9DB8] border-[#1E335A]' },
    { name: 'Vermelho / Urgente', value: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40' },
    { name: 'Âmbar / Alerta', value: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40' }
  ];

  const handleCreateTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setShowTagCreator(false);
  };

  // EXCEL IMPORT & EXPORT HANDLERS
  const handleExportExcel = () => {
    try {
      const dataToExport = clients.map(c => ({
        'Nome': c.name,
        'Telefone': c.phone,
        'Email': c.email || '',
        'Empreendimento': c.empreendimento || '',
        'Origem': c.origem || '',
        'Status': c.status,
        'Observações': c.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, 'Leads_Chibi_CRM.xlsx');
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao exportar os dados para Excel.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (rawData.length === 0) {
          alert('A planilha importada está vazia.');
          return;
        }

        const parsedRows: ImportedRow[] = rawData.map((row: any) => {
          const name = row['Nome'] || row['nome'] || row['Name'] || row['name'] || '';
          const phone = row['Telefone'] || row['telefone'] || row['Phone'] || row['phone'] || '';
          const email = row['Email'] || row['email'] || row['Mail'] || row['mail'] || '';
          const empreendimento = row['Empreendimento'] || row['empreendimento'] || row['Imóvel'] || row['imovel'] || '';
          const origem = row['Origem'] || row['origem'] || row['Source'] || row['source'] || '';
          const statusRaw = row['Status'] || row['status'] || 'Lead Novo';
          const notes = row['Observações'] || row['observações'] || row['Notes'] || row['notes'] || '';

          const validStatuses: ClientStatus[] = [
            'Lead Novo', 'Contato', 'Em Atendimento', 'Retrabalho', 'Agendado',
            'Visitou', 'Proposta', 'Documentação', 'Venda Fechada', 'Perdido'
          ];
          const status = validStatuses.includes(statusRaw) ? statusRaw as ClientStatus : 'Lead Novo';

          return {
            name: String(name).trim(),
            phone: String(phone).trim(),
            email: email ? String(email).trim() : undefined,
            empreendimento: empreendimento ? String(empreendimento).trim() : undefined,
            origem: origem ? String(origem).trim() : undefined,
            status,
            notes: notes ? String(notes).trim() : '',
            valid: !!String(name).trim() && !!String(phone).trim()
          };
        });

        setPreviewRows(parsedRows);
        setShowPreviewModal(true);
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel. Certifique-se de que é uma planilha válida.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    const validRows = previewRows.filter(r => r.valid);
    if (validRows.length === 0) {
      alert('Nenhum lead válido para importação. O Nome e Telefone são campos obrigatórios.');
      return;
    }

    onImportClients(validRows.map(r => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      empreendimento: r.empreendimento,
      origem: r.origem,
      status: r.status,
      notes: r.notes
    })));

    setShowPreviewModal(false);
  };

  // Helpers for special filters
  const isClientHighPriority = (client: Client) => {
    const alerts = getClientAlerts(client);
    if (alerts.isUrgente) return true;
    
    if (client.status === 'Proposta' || client.status === 'Documentação' || client.status === 'Visitou') {
      return true;
    }
    
    const tagsLower = (client.tags || []).map(t => t.toLowerCase());
    if (tagsLower.includes('urgente') || tagsLower.includes('alta prioridade') || tagsLower.includes('investidor')) {
      return true;
    }
    
    if (client.contactCount >= 8) {
      return true;
    }
    
    return false;
  };

  const isClientNoNextContact = (client: Client) => {
    return !client.nextContactDate && client.status !== 'Venda Fechada' && client.status !== 'Perdido';
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // 1. Search term
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
        (client.empreendimento && client.empreendimento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        client.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Tag filter
      const matchesTag = selectedTagFilter === 'all' || client.tags.includes(selectedTagFilter);

      // 3. Status filter
      const matchesStatus = selectedStatusFilter === 'all' || client.status === selectedStatusFilter;

      // 4. Special filter
      let matchesSpecial = true;
      if (selectedSpecialFilter === 'high_priority') {
        matchesSpecial = isClientHighPriority(client);
      } else if (selectedSpecialFilter === 'no_next_contact') {
        matchesSpecial = isClientNoNextContact(client);
      }

      return matchesSearch && matchesTag && matchesStatus && matchesSpecial;
    });
  }, [clients, searchTerm, selectedTagFilter, selectedStatusFilter, selectedSpecialFilter]);

  const hasActiveFilters = searchTerm !== '' || selectedTagFilter !== 'all' || selectedStatusFilter !== 'all' || selectedSpecialFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTagFilter('all');
    setSelectedStatusFilter('all');
    handleSpecialFilterChange('all');
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'Lead Novo':
        return 'bg-[#00C7F2]/12 text-[#00C7F2] border-[#00C7F2]/30';
      case 'Contato':
        return 'bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/30';
      case 'Em Atendimento':
        return 'bg-[#1D68FF]/12 text-[#38BDF8] border-[#1D68FF]/30';
      case 'Retrabalho':
        return 'bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/30';
      case 'Agendado':
        return 'bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/30';
      case 'Visitou':
        return 'bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/30';
      case 'Proposta':
        return 'bg-[#1D68FF]/15 text-[#0099FF] border-[#1D68FF]/30';
      case 'Documentação':
        return 'bg-[#1D68FF]/20 text-[#00C7F2] border-[#1D68FF]/35';
      case 'Venda Fechada':
        return 'bg-[#10B981]/12 text-[#10B981] border-[#10B981]/30';
      case 'Perdido':
        return 'bg-[#EF4444]/12 text-[#EF4444] border-[#EF4444]/30';
      default:
        return 'bg-[#101C33] text-[#8E9DB8] border-[#1E335A]';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6" id="client-directory-panel">
      {/* Header and Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display text-white tracking-tight">
              Gestão de Clientes & Leads
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#101C33] text-[#38BDF8] border border-[#1E335A]">
              {filteredClients.length} {filteredClients.length === 1 ? 'lead' : 'leads'}
            </span>
          </div>
          <p className="text-xs text-[#8E9DB8] mt-0.5">
            Base de dados comercial, histórico e controle individualizado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* Importar Excel */}
          <button
            onClick={handleImportClick}
            className="bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] text-[#8E9DB8] hover:text-white px-3.5 py-2 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Importar Leads de planilha Excel"
          >
            <Upload className="h-3.5 w-3.5 text-[#10B981]" />
            <span>Importar</span>
          </button>

          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="bg-[#0B1323] border border-[#16243F] hover:bg-[#101B30] text-[#8E9DB8] hover:text-white px-3.5 py-2 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Exportar todos os Leads para planilha Excel"
          >
            <Download className="h-3.5 w-3.5 text-[#00C7F2]" />
            <span>Exportar</span>
          </button>

          {/* Custom tag manager trigger */}
          <button
            onClick={() => setShowTagCreator(!showTagCreator)}
            className={`border px-3.5 py-2 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showTagCreator
                ? 'bg-[#1D68FF]/15 border-[#1D68FF] text-[#00C7F2]'
                : 'bg-[#0B1323] border-[#16243F] text-[#8E9DB8] hover:bg-[#101B30] hover:text-white'
            }`}
          >
            <TagIcon className="h-3.5 w-3.5 text-[#00C7F2]" />
            <span>Etiquetas</span>
          </button>

          <button
            onClick={() => onAddClient()}
            className="bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white px-4 py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all hover:brightness-110"
            id="open-add-client-modal-btn"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tag Creator Dropdown Card */}
      <AnimatePresence>
        {showTagCreator && (
          <motion.div 
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="bg-[#0B1323] border border-[#16243F] p-4 rounded-[16px] shadow-lg max-w-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5 text-[#00C7F2]" />
                Criar Nova Etiqueta WhatsApp
              </h3>
              <button 
                onClick={() => setShowTagCreator(false)}
                className="text-[#8E9DB8] hover:text-white p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTagSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase mb-1">Nome da Etiqueta</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Investidor Alto Padrão, Urgente..."
                  className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9DB8] uppercase mb-1">Cor da Etiqueta</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 border border-[#16243F] rounded-[10px]">
                  {TAG_COLOR_PRESETS.map(preset => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => setNewTagColor(preset.value)}
                      className={`p-2 text-[10px] rounded-lg border text-left transition-all cursor-pointer ${
                        newTagColor === preset.value 
                          ? 'border-[#1D68FF] ring-2 ring-[#1D68FF]/20 font-bold bg-[#1D68FF]/10' 
                          : 'border-[#16243F] hover:bg-[#101B30]'
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded-full ${preset.value}`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-[#16243F]">
                <button
                  type="button"
                  onClick={() => setShowTagCreator(false)}
                  className="text-xs text-[#8E9DB8] font-semibold px-3 py-1.5 border border-[#16243F] rounded-[10px] hover:bg-[#101B30] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-xs bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-bold px-3.5 py-1.5 rounded-[10px] shadow-xs cursor-pointer hover:brightness-110"
                >
                  Salvar Etiqueta
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters Hub */}
      <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5A75] h-4 w-4" />
            <input
              type="text"
              placeholder="Pesquisar por nome, telefone, empreendimento ou etiquetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080E1A] border border-[#16243F] rounded-[10px] pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] focus:border-[#1D68FF]"
              id="search-client-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9DB8] hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-[#8E9DB8] focus:text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
              id="filter-status-select"
            >
              <option value="all">Todas as Etapas</option>
              <option value="Lead Novo">Lead Novo</option>
              <option value="Contato">Contato</option>
              <option value="Em Atendimento">Em Atendimento</option>
              <option value="Retrabalho">Retrabalho</option>
              <option value="Agendado">Agendado</option>
              <option value="Visitou">Visitou</option>
              <option value="Proposta">Proposta</option>
              <option value="Documentação">Documentação</option>
              <option value="Venda Fechada">Venda Fechada</option>
              <option value="Perdido">Perdido</option>
            </select>

            {/* Tag Filter */}
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-[#8E9DB8] focus:text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
              id="filter-tag-select"
            >
              <option value="all">Todas Etiquetas</option>
              {tags.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>

            {/* Special Filter */}
            <select
              value={selectedSpecialFilter}
              onChange={(e) => handleSpecialFilterChange(e.target.value as any)}
              className="bg-[#080E1A] border border-[#16243F] rounded-[10px] px-3 py-2 text-xs text-[#8E9DB8] focus:text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
              id="filter-special-select"
            >
              <option value="all">Todos os Alertas</option>
              <option value="high_priority">Alta Prioridade</option>
              <option value="no_next_contact">Sem Retorno Agendado</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#080E1A] border border-[#16243F] rounded-[10px] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-[#1D68FF] text-white shadow-2xs font-bold' 
                    : 'text-[#8E9DB8] hover:text-white'
                }`}
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-[#1D68FF] text-white shadow-2xs font-bold' 
                    : 'text-[#8E9DB8] hover:text-white'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-[#16243F] text-xs">
            <span className="text-[10px] font-bold text-[#4B5A75] uppercase">Filtros Ativos:</span>
            {searchTerm && (
              <span className="bg-[#101C33] text-[#38BDF8] px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#1E335A]">
                Busca: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-400 cursor-pointer">×</button>
              </span>
            )}
            {selectedStatusFilter !== 'all' && (
              <span className="bg-[#101C33] text-[#38BDF8] px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#1E335A]">
                Etapa: {selectedStatusFilter}
                <button onClick={() => setSelectedStatusFilter('all')} className="hover:text-rose-400 cursor-pointer">×</button>
              </span>
            )}
            {selectedTagFilter !== 'all' && (
              <span className="bg-[#101C33] text-[#38BDF8] px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#1E335A]">
                Tag: {selectedTagFilter}
                <button onClick={() => setSelectedTagFilter('all')} className="hover:text-rose-400 cursor-pointer">×</button>
              </span>
            )}
            {selectedSpecialFilter !== 'all' && (
              <span className="bg-[#101C33] text-[#38BDF8] px-2 py-0.5 rounded-md flex items-center gap-1 border border-[#1E335A]">
                {selectedSpecialFilter === 'high_priority' ? 'Alta Prioridade' : 'Sem Retorno Agendado'}
                <button onClick={() => handleSpecialFilterChange('all')} className="hover:text-rose-400 cursor-pointer">×</button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-[#00C7F2] hover:underline ml-auto cursor-pointer"
            >
              Limpar Todos
            </button>
          </div>
        )}
      </div>

      {/* Results Listing */}
      {filteredClients.length === 0 ? (
        <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-12 text-center text-[#8E9DB8] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#101C33] flex items-center justify-center mx-auto text-[#8E9DB8]">
            <FolderMinus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Nenhum cliente encontrado</p>
            <p className="text-xs max-w-sm mx-auto mt-1 text-[#8E9DB8]">
              Experimente alterar os filtros de pesquisa ou cadastrar um novo cliente para esta seção.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs font-bold text-[#00C7F2] bg-[#1D68FF]/15 hover:bg-[#1D68FF]/25 px-3 py-1.5 rounded-[10px] transition-colors cursor-pointer inline-block"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] overflow-hidden shadow-xs">
          <div className="divide-y divide-[#16243F]">
            {filteredClients.map(client => {
              const alerts = getClientAlerts(client);
              const days = getDaysSinceContact(client);

              let daysColor = 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/30';
              if (days >= 15) {
                daysColor = 'text-[#EF4444] bg-[#EF4444]/12 border-[#EF4444]/30 animate-pulse';
              } else if (days >= 4) {
                daysColor = 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/30';
              }

              return (
                <div
                  key={client.id}
                  className="p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#101B30] transition-colors group"
                  id={`client-row-${client.id}`}
                >
                  {/* Avatar and Main Info */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    {/* Initials bubble */}
                    <div 
                      onClick={() => onSelectClient(client.id)}
                      className="w-10 h-10 rounded-[12px] bg-[#101C33] border border-[#16243F] text-[#38BDF8] font-extrabold text-xs flex items-center justify-center shrink-0 cursor-pointer shadow-2xs group-hover:border-[#1D68FF] transition-colors"
                    >
                      {getInitials(client.name)}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 
                          onClick={() => onSelectClient(client.id)}
                          className="font-bold text-sm sm:text-base text-white hover:text-[#00C7F2] cursor-pointer transition-colors truncate"
                        >
                          {client.name}
                        </h3>

                        {/* Display Status tag */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>

                        {/* Client Rules Warning Badges */}
                        {alerts.isAtrasado && (
                          <span className="text-[9px] font-bold text-[#F59E0B] bg-[#F59E0B]/12 px-1.5 py-0.5 rounded-md border border-[#F59E0B]/30 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 animate-pulse" />
                            <span>Retorno Atrasado</span>
                          </span>
                        )}
                        {alerts.isUrgente && (
                          <span className="text-[9px] font-bold text-[#EF4444] bg-[#EF4444]/12 px-1.5 py-0.5 rounded-md border border-[#EF4444]/30 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            <span>&gt;15 dias parado</span>
                          </span>
                        )}
                        {alerts.isSemRetorno && (
                          <span className="text-[9px] font-bold text-[#F59E0B] bg-[#F59E0B]/12 px-1.5 py-0.5 rounded-md border border-[#F59E0B]/30 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Sem retorno</span>
                          </span>
                        )}
                        {client.secondBrainSummary && (
                          <span 
                            title={`Second Brain: ${typeof client.secondBrainSummary === 'object' ? client.secondBrainSummary.recommendedAngle : client.secondBrainSummary}`}
                            className="text-[9px] font-bold text-[#00C7F2] bg-[#1D68FF]/15 px-1.5 py-0.5 rounded-md border border-[#1D68FF]/30 flex items-center gap-1"
                          >
                            <Brain className="h-3 w-3" />
                            <span>Second Brain</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8E9DB8]">
                        <span className="font-mono text-white">{client.phone}</span>
                        {client.empreendimento && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-[#16243F]" />
                            <span className="text-[#8E9DB8] font-medium truncate max-w-[200px]">
                              {client.empreendimento}
                            </span>
                          </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-[#16243F]" />
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${daysColor}`}>
                          {days}d sem toque
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#16243F]" />
                        <span className="text-[11px] text-[#4B5A75]">
                          {client.contactCount} {client.contactCount === 1 ? 'toque' : 'toques'}
                        </span>
                      </div>

                      {/* Tags WhatsApp style */}
                      {client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {client.tags.map(tagName => {
                            const tagColor = tags.find(t => t.name === tagName)?.color || 'bg-[#101C33] text-[#8E9DB8] border-[#16243F]';
                            return (
                              <span
                                key={tagName}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tagColor}`}
                              >
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-[#16243F] w-full md:w-auto justify-end">
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="px-3 py-1.5 rounded-[8px] text-[#00C7F2] bg-transparent hover:bg-[#1D68FF]/10 transition-colors font-bold text-xs border border-[#1D68FF] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3 text-[#00C7F2]" />
                      <span>Ficha</span>
                    </button>

                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="p-2 bg-[#10B981] hover:bg-[#10B981]/80 text-white rounded-[8px] transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>

                    <a
                      href={`tel:${client.phone.replace(/\D/g, '')}`}
                      className="p-2 bg-[#101C33] hover:bg-[#16243F] text-[#8E9DB8] hover:text-white rounded-[8px] transition-all cursor-pointer"
                      title="Ligar"
                    >
                      <Phone className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => {
                        if (confirm(`Excluir permanentemente o cliente ${client.name}?`)) {
                          onDeleteClient(client.id);
                        }
                      }}
                      className="p-2 hover:bg-[#EF4444]/15 text-[#4B5A75] hover:text-[#EF4444] rounded-[8px] transition-colors cursor-pointer"
                      title="Excluir Cliente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const alerts = getClientAlerts(client);
            const days = getDaysSinceContact(client);

            let daysColor = 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/30';
            if (days >= 15) {
              daysColor = 'text-[#EF4444] bg-[#EF4444]/12 border-[#EF4444]/30 animate-pulse';
            } else if (days >= 4) {
              daysColor = 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/30';
            }

            return (
              <div
                key={client.id}
                className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div 
                        onClick={() => onSelectClient(client.id)}
                        className="w-9 h-9 rounded-[10px] bg-[#101C33] border border-[#16243F] text-[#38BDF8] font-extrabold text-xs flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        {getInitials(client.name)}
                      </div>
                      <div>
                        <h3 
                          onClick={() => onSelectClient(client.id)}
                          className="font-bold text-sm text-white hover:text-[#00C7F2] cursor-pointer transition-colors truncate max-w-[160px]"
                        >
                          {client.name}
                        </h3>
                        <p className="text-xs font-mono text-[#8E9DB8]">{client.phone}</p>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </div>

                  {client.empreendimento && (
                    <div className="bg-[#080E1A] rounded-[10px] p-2 text-xs border border-[#16243F]">
                      <span className="text-[9px] uppercase font-bold text-[#4B5A75] block">Imóvel de Interesse</span>
                      <p className="text-[#8E9DB8] font-medium truncate">{client.empreendimento}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${daysColor}`}>
                      {days}d sem contato
                    </span>
                    <span className="text-[10px] text-[#4B5A75]">
                      {client.contactCount} toques
                    </span>
                  </div>

                  {/* Tags */}
                  {client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {client.tags.map(tagName => {
                        const tagColor = tags.find(t => t.name === tagName)?.color || 'bg-[#101C33] text-[#8E9DB8] border-[#16243F]';
                        return (
                          <span
                            key={tagName}
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${tagColor}`}
                          >
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#16243F]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="text-xs font-bold text-[#00C7F2] hover:text-[#38BDF8] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Ficha</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    {client.secondBrainSummary && (
                      <span 
                        title={`Second Brain: ${typeof client.secondBrainSummary === 'object' ? client.secondBrainSummary.recommendedAngle : client.secondBrainSummary}`}
                        className="p-1 bg-[#1D68FF]/15 text-[#00C7F2] rounded-md flex items-center"
                      >
                        <Brain className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="p-1.5 bg-[#10B981] hover:bg-[#10B981]/80 text-white rounded-[8px] transition-all shadow-2xs"
                      title="WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`tel:${client.phone.replace(/\D/g, '')}`}
                      className="p-1.5 bg-[#101C33] hover:bg-[#16243F] text-[#8E9DB8] hover:text-white rounded-[8px] transition-all"
                      title="Ligar"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Excel Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div 
            className="fixed inset-0 bg-[#060A12]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B1323] rounded-[16px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-[#16243F]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-[#16243F] flex items-center justify-between bg-[#080E1A]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#10B981]/15 text-[#10B981] rounded-[10px]">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-display">
                      Prévia da Importação Excel
                    </h2>
                    <p className="text-xs text-[#8E9DB8]">
                      Confira os dados lidos da planilha antes de salvar no CRM
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 hover:bg-[#101B30] rounded-[10px] text-[#8E9DB8] hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Grid / Table Container */}
              <div className="flex-1 overflow-auto p-6 space-y-4">
                <div className="border border-[#16243F] rounded-[12px] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#080E1A] border-b border-[#16243F] text-[10px] uppercase font-bold text-[#8E9DB8]">
                        <th className="p-3">Status</th>
                        <th className="p-3">Nome</th>
                        <th className="p-3">Telefone</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Empreendimento</th>
                        <th className="p-3">Origem</th>
                        <th className="p-3">Etapa do Funil</th>
                        <th className="p-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16243F] text-xs">
                      {previewRows.map((row, index) => (
                        <tr 
                          key={index}
                          className={`${row.valid ? 'hover:bg-[#101B30]' : 'bg-[#EF4444]/10'}`}
                        >
                          <td className="p-3 font-semibold">
                            {row.valid ? (
                              <span className="text-[#10B981] flex items-center gap-1 font-bold text-[11px]">
                                <Check className="h-3.5 w-3.5" /> Válido
                              </span>
                            ) : (
                              <span className="text-[#EF4444] flex items-center gap-1 font-bold text-[11px]" title="Nome e Telefone são obrigatórios">
                                <AlertCircle className="h-3.5 w-3.5" /> Inválido
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-white max-w-[120px] truncate">{row.name || <span className="italic text-[#EF4444]">Ausente</span>}</td>
                          <td className="p-3 font-mono text-[#8E9DB8] max-w-[120px] truncate">{row.phone || <span className="italic text-[#EF4444]">Ausente</span>}</td>
                          <td className="p-3 text-[#8E9DB8] max-w-[120px] truncate">{row.email || <span className="text-[#4B5A75]">-</span>}</td>
                          <td className="p-3 text-[#8E9DB8] max-w-[120px] truncate">{row.empreendimento || <span className="text-[#4B5A75]">-</span>}</td>
                          <td className="p-3 text-[#8E9DB8] max-w-[120px] truncate">{row.origem || <span className="text-[#4B5A75]">-</span>}</td>
                          <td className="p-3">
                            <span className="bg-[#101C33] text-[#38BDF8] font-bold px-2 py-0.5 rounded-full text-[10px] uppercase border border-[#1E335A]">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-[#8E9DB8] max-w-[180px] truncate" title={row.notes}>{row.notes || <span className="text-[#4B5A75]">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewRows.some(r => !r.valid) && (
                  <p className="text-xs text-[#EF4444] mt-3 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Atenção: Linhas marcadas como "Inválido" não serão importadas por falta de Nome ou Telefone.
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-5 border-t border-[#16243F] flex items-center justify-between bg-[#080E1A]">
                <span className="text-xs text-[#8E9DB8]">
                  Total de leads válidos: <strong className="text-white">{previewRows.filter(r => r.valid).length}</strong> de {previewRows.length}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="border border-[#16243F] hover:bg-[#101B30] text-[#8E9DB8] hover:text-white px-4 py-2 rounded-[10px] text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white px-5 py-2 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer hover:brightness-110 transition-all"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirmar Importação</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
