import React, { useState, useMemo } from 'react';
import { Sale, Client } from '../types';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Award, 
  Activity, 
  Briefcase,
  AlertCircle,
  Download,
  Target,
  Calculator,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Percent,
  X,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface CommissionsProps {
  sales: Sale[];
  clients: Client[];
  onAddSale: (sale: Omit<Sale, 'id'>) => void;
  onDeleteSale: (id: string) => void;
}

export default function Commissions({
  sales,
  clients,
  onAddSale,
  onDeleteSale
}: CommissionsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'Recebido' | 'A Receber'>('all');

  // Broker Monthly Target State (Default R$ 30.000)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('merlin_broker_monthly_target');
    return saved ? parseFloat(saved) : 30000;
  });
  const [editingTargetInput, setEditingTargetInput] = useState<string>(monthlyTarget.toString());

  // Form States
  const [clientSelectionType, setClientSelectionType] = useState<'existing' | 'custom'>('existing');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [commissionValue, setCommissionValue] = useState('');
  const [vgvValue, setVgvValue] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [commissionRate, setCommissionRate] = useState('3.0');
  const [paymentStatus, setPaymentStatus] = useState<'Recebido' | 'A Receber'>('Recebido');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  // Standalone Calculator States
  const [calcVgv, setCalcVgv] = useState('850000');
  const [calcRate, setCalcRate] = useState('4.0');
  const [calcRepasse, setCalcRepasse] = useState('50'); // 50% repasse corretor

  const referenceDate = new Date();
  const currentMonth = referenceDate.getMonth(); // 0-indexed
  const currentYear = referenceDate.getFullYear();

  // Save Target
  const handleSaveTarget = () => {
    const val = parseFloat(editingTargetInput);
    if (!isNaN(val) && val > 0) {
      setMonthlyTarget(val);
      localStorage.setItem('merlin_broker_monthly_target', val.toString());
      setShowGoalModal(false);
    }
  };

  // Metric Calculations
  const monthlySales = useMemo(() => {
    return sales.filter(s => {
      const sDate = new Date(s.saleDate + 'T12:00:00');
      return sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
    });
  }, [sales, currentMonth, currentYear]);

  const monthCommissionTotal = useMemo(() => {
    return monthlySales.reduce((sum, s) => sum + s.commissionValue, 0);
  }, [monthlySales]);

  const yearCommissionTotal = useMemo(() => {
    return sales
      .filter(s => new Date(s.saleDate + 'T12:00:00').getFullYear() === selectedYear)
      .reduce((sum, s) => sum + s.commissionValue, 0);
  }, [sales, selectedYear]);

  const totalSalesCount = sales.length;

  const ticketMedio = useMemo(() => {
    return totalSalesCount > 0 
      ? Math.round(sales.reduce((sum, s) => sum + s.commissionValue, 0) / totalSalesCount)
      : 0;
  }, [sales, totalSalesCount]);

  // Goal Progress Math
  const goalProgressPercent = Math.min(100, Math.round((monthCommissionTotal / monthlyTarget) * 100));
  const goalRemainingValue = Math.max(0, monthlyTarget - monthCommissionTotal);
  const salesNeededForGoal = ticketMedio > 0 && goalRemainingValue > 0
    ? Math.ceil(goalRemainingValue / ticketMedio)
    : goalRemainingValue > 0 ? 1 : 0;

  // Auto-calculate commission based on VGV
  const handleVgvChange = (vgvStr: string) => {
    setVgvValue(vgvStr);
    const vgvNum = parseFloat(vgvStr);
    const rateNum = parseFloat(commissionRate);
    if (!isNaN(vgvNum) && !isNaN(rateNum) && vgvNum > 0) {
      const calculatedComm = (vgvNum * (rateNum / 100)).toFixed(2);
      setCommissionValue(calculatedComm);
    }
  };

  // Submit Sale Handler
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    let clientName = '';
    let clientId: string | undefined = undefined;

    if (clientSelectionType === 'existing') {
      const foundClient = clients.find(c => c.id === selectedClientId);
      if (!foundClient) {
        alert('Selecione um cliente válido da carteira ou digite um nome avulso.');
        return;
      }
      clientName = foundClient.name;
      clientId = foundClient.id;
    } else {
      if (!customClientName.trim()) {
        alert('Digite o nome do comprador.');
        return;
      }
      clientName = customClientName.trim();
    }

    const value = parseFloat(commissionValue);
    if (isNaN(value) || value <= 0) {
      alert('Digite um valor de comissão válido.');
      return;
    }

    onAddSale({
      clientId,
      clientName,
      commissionValue: value,
      saleDate,
      vgv: vgvValue ? parseFloat(vgvValue) : undefined,
      propertyName: propertyName.trim() || undefined,
      commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
      paymentStatus,
      notes: notes.trim() || undefined
    });

    // Reset Form
    setSelectedClientId('');
    setCustomClientName('');
    setCommissionValue('');
    setVgvValue('');
    setPropertyName('');
    setNotes('');
    setShowAddForm(false);
  };

  // Filtered sales for the table
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        // Year filter
        const sYear = new Date(s.saleDate + 'T12:00:00').getFullYear();
        if (sYear !== selectedYear) return false;

        // Status filter
        if (selectedStatusFilter !== 'all' && (s.paymentStatus || 'Recebido') !== selectedStatusFilter) {
          return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesName = s.clientName.toLowerCase().includes(term);
          const matchesProp = s.propertyName?.toLowerCase().includes(term);
          if (!matchesName && !matchesProp) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, selectedYear, selectedStatusFilter, searchTerm]);

  // Export to Excel
  const handleExportExcel = () => {
    if (sales.length === 0) {
      alert('Não há registros de vendas para exportar.');
      return;
    }

    const dataToExport = sales.map(s => ({
      'Cliente Comprador': s.clientName,
      'Data da Venda': new Date(s.saleDate + 'T12:00:00').toLocaleDateString('pt-BR'),
      'Empreendimento / Imóvel': s.propertyName || 'N/A',
      'VGV (R$)': s.vgv || 0,
      'Taxa Comissão (%)': s.commissionRate ? `${s.commissionRate}%` : 'N/A',
      'Comissão Recebida (R$)': s.commissionValue,
      'Status': s.paymentStatus || 'Recebido',
      'Observações': s.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comissões');
    XLSX.writeFile(workbook, `Extrato_Comissoes_${selectedYear}.xlsx`);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculated honorários in calculator modal
  const calcGross = (parseFloat(calcVgv) || 0) * ((parseFloat(calcRate) || 0) / 100);
  const calcNet = calcGross * ((parseFloat(calcRepasse) || 0) / 100);

  return (
    <div className="space-y-6" id="commissions-panel">
      {/* 1. Header with Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <span>Controle Financeiro &amp; Comissões</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30">
              {sales.length} escrituras fechadas
            </span>
          </h2>
          <p className="text-xs text-[#8E9DB8]">
            Acompanhe seu rendimento mensal, metas de faturamento e extrato detalhado
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Calculator Trigger */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="p-2.5 rounded-[10px] border border-[#16243F] bg-[#0B1323] text-[#8E9DB8] hover:text-[#00C7F2] hover:bg-[#101B30] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Simulador de Honorários e VGV"
          >
            <Calculator className="h-4 w-4 text-[#00C7F2]" />
            <span className="hidden sm:inline">Calculadora VGV</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="p-2.5 rounded-[10px] border border-[#16243F] bg-[#0B1323] text-[#8E9DB8] hover:text-[#10B981] hover:bg-[#101B30] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Exportar Planilha Excel (.xlsx)"
          >
            <Download className="h-4 w-4 text-[#10B981]" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          {/* Register Sale Primary Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold px-4 py-2.5 rounded-[10px] text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer hover:brightness-110"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Lançar Venda</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Target & Progress Box */}
      <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1D68FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-[#0099FF]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Target Stats */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#1D68FF]/15 text-[#00C7F2] rounded-[10px] border border-[#1D68FF]/30">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#00C7F2] font-display">
                    Meta de Comissões do Mês
                  </h3>
                  <p className="text-xs text-[#8E9DB8]">
                    Acompanhamento em tempo real para o mês vigente
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingTargetInput(monthlyTarget.toString());
                  setShowGoalModal(true);
                }}
                className="text-xs text-[#00C7F2] hover:text-[#38BDF8] underline font-semibold cursor-pointer"
              >
                Ajustar Meta
              </button>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
                {formatCurrency(monthCommissionTotal)}
              </span>
              <span className="text-sm text-[#8E9DB8] font-medium">
                de {formatCurrency(monthlyTarget)}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                goalProgressPercent >= 100 
                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' 
                  : 'bg-[#101C33] text-[#38BDF8] border border-[#1E335A]'
              }`}>
                {goalProgressPercent}% atingido
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#080E1A] rounded-full h-3 overflow-hidden p-0.5 border border-[#16243F]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalProgressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#1D68FF] to-[#0099FF] shadow-sm shadow-blue-500/50"
              />
            </div>
          </div>

          {/* Goal Insights pill */}
          <div className="bg-[#080E1A] border border-[#16243F] rounded-[14px] p-4 flex items-center gap-4 min-w-[240px]">
            <div className="p-3 rounded-[10px] bg-[#1D68FF]/15 text-[#00C7F2] border border-[#1D68FF]/30">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[#8E9DB8] tracking-wider">
                Para Bater a Meta:
              </p>
              {goalRemainingValue === 0 ? (
                <p className="text-sm font-bold text-[#10B981] flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Meta Atingida! Parabéns!
                </p>
              ) : (
                <>
                  <p className="text-base font-bold text-white">
                    Faltam {formatCurrency(goalRemainingValue)}
                  </p>
                  <p className="text-[11px] text-[#8E9DB8]">
                    Aprox. <strong className="text-[#00C7F2]">{salesNeededForGoal} {salesNeededForGoal === 1 ? 'venda' : 'vendas'}</strong> pelo ticket médio
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Metric Bento Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Month Commission */}
        <div className="bg-[#0B1323] border border-[#16243F] p-4 sm:p-5 rounded-[16px] shadow-xs space-y-2 hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all">
          <div className="flex items-center justify-between text-[#8E9DB8]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Comissão do Mês</span>
            <div className="p-2 bg-[#10B981]/12 text-[#10B981] rounded-[10px]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xl sm:text-2xl font-black font-display text-white">
              {formatCurrency(monthCommissionTotal)}
            </h4>
            <p className="text-[10px] text-[#8E9DB8]">{monthlySales.length} fechamentos no mês</p>
          </div>
        </div>

        {/* Metric 2: Year Commission */}
        <div className="bg-[#0B1323] border border-[#16243F] p-4 sm:p-5 rounded-[16px] shadow-xs space-y-2 hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all">
          <div className="flex items-center justify-between text-[#8E9DB8]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Acumulado {selectedYear}</span>
            <div className="p-2 bg-[#1D68FF]/12 text-[#00C7F2] rounded-[10px]">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xl sm:text-2xl font-black font-display text-white">
              {formatCurrency(yearCommissionTotal)}
            </h4>
            <p className="text-[10px] text-[#4B5A75]">Total no ano em exercício</p>
          </div>
        </div>

        {/* Metric 3: Total Sales */}
        <div className="bg-[#0B1323] border border-[#16243F] p-4 sm:p-5 rounded-[16px] shadow-xs space-y-2 hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all">
          <div className="flex items-center justify-between text-[#8E9DB8]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total de Vendas</span>
            <div className="p-2 bg-[#1D68FF]/12 text-[#38BDF8] rounded-[10px]">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xl sm:text-2xl font-black font-display text-white">
              {totalSalesCount}
            </h4>
            <p className="text-[10px] text-[#4B5A75]">Escrituras e contratos</p>
          </div>
        </div>

        {/* Metric 4: Ticket Médio */}
        <div className="bg-[#0B1323] border border-[#16243F] p-4 sm:p-5 rounded-[16px] shadow-xs space-y-2 hover:border-[#1D68FF] hover:bg-[#101B30] hover:shadow-[0_0_12px_rgba(29,104,255,0.25)] transition-all">
          <div className="flex items-center justify-between text-[#8E9DB8]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 bg-[#1D68FF]/12 text-[#00C7F2] rounded-[10px]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xl sm:text-2xl font-black font-display text-white">
              {formatCurrency(ticketMedio)}
            </h4>
            <p className="text-[10px] text-[#4B5A75]">Honorários médios por venda</p>
          </div>
        </div>
      </div>

      {/* 4. Standalone VGV / Honorários Calculator (Collapsible) */}
      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0B1323] border border-[#16243F] rounded-[16px] p-5 sm:p-6 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#16243F]">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#00C7F2]" />
                <h3 className="font-bold text-sm text-white font-display">
                  Simulador de VGV &amp; Divisão de Comissões
                </h3>
              </div>
              <button 
                onClick={() => setShowCalculator(false)}
                className="text-[#8E9DB8] hover:text-white p-1 rounded-lg hover:bg-[#101B30] transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#8E9DB8]">Valor do Imóvel (VGV)</label>
                <input
                  type="number"
                  value={calcVgv}
                  onChange={(e) => setCalcVgv(e.target.value)}
                  className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                  placeholder="Ex: 850000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#8E9DB8]">Comissão da Imobiliária (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value)}
                  className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                  placeholder="Ex: 4.0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#8E9DB8]">Seu Repasse Corretor (%)</label>
                <input
                  type="number"
                  value={calcRepasse}
                  onChange={(e) => setCalcRepasse(e.target.value)}
                  className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                  placeholder="Ex: 50"
                />
              </div>
            </div>

            {/* Calculated output card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-[10px] bg-[#080E1A] border border-[#16243F]">
                <span className="text-[10px] font-bold text-[#8E9DB8] uppercase">Comissão Bruta Total:</span>
                <p className="text-base font-black text-white font-mono">
                  {formatCurrency(calcGross)}
                </p>
              </div>
              <div className="p-3 rounded-[10px] bg-[#1D68FF]/15 border border-[#1D68FF]/30">
                <span className="text-[10px] font-bold text-[#00C7F2] uppercase">Sua Comissão Líquida a Receber:</span>
                <p className="text-lg font-black text-[#00C7F2] font-mono">
                  {formatCurrency(calcNet)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Sales Statement Table with Search & Year Filters */}
      <div className="bg-[#0B1323] border border-[#16243F] rounded-[16px] overflow-hidden shadow-xs space-y-4">
        {/* Table Header / Filters */}
        <div className="p-4 sm:p-5 border-b border-[#16243F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#080E1A]">
          <div>
            <h3 className="font-bold text-sm font-display text-white">
              Extrato de Vendas &amp; Recebimentos
            </h3>
            <p className="text-xs text-[#8E9DB8]">
              Exibindo {filteredSales.length} de {sales.length} registros
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4B5A75]" />
              <input
                type="text"
                placeholder="Filtrar por comprador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs bg-[#0B1323] border border-[#16243F] rounded-[10px] pl-8 pr-3 py-1.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="text-xs bg-[#0B1323] border border-[#16243F] rounded-[10px] px-2.5 py-1.5 text-[#8E9DB8] focus:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todos Status</option>
              <option value="Recebido">Recebidos</option>
              <option value="A Receber">A Receber</option>
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-xs bg-[#0B1323] border border-[#16243F] rounded-[10px] px-2.5 py-1.5 text-[#8E9DB8] focus:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={2026}>Ano 2026</option>
              <option value={2025}>Ano 2025</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-[#8E9DB8] space-y-2">
            <AlertCircle className="h-10 w-10 mx-auto text-[#4B5A75]" />
            <p className="font-bold text-sm text-white">Nenhum lançamento encontrado</p>
            <p className="text-xs max-w-sm mx-auto text-[#8E9DB8]">Cadastre suas vendas para alimentar o painel financeiro e acompanhar suas metas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#16243F] text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider bg-[#080E1A]/50">
                  <th className="p-4 pl-6">Cliente Comprador</th>
                  <th className="p-4">Empreendimento</th>
                  <th className="p-4">Data da Venda</th>
                  <th className="p-4 text-right">VGV do Imóvel</th>
                  <th className="p-4 text-right">Sua Comissão</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16243F] text-xs">
                {filteredSales.map(sale => {
                  return (
                    <tr 
                      key={sale.id}
                      className="hover:bg-[#101B30] transition-all"
                      id={`sale-row-${sale.id}`}
                    >
                      {/* Buyer */}
                      <td className="p-4 pl-6 font-bold text-white">
                        {sale.clientName}
                        {sale.clientId && (
                          <span className="text-[9px] text-[#00C7F2] bg-[#1D68FF]/15 border border-[#1D68FF]/30 px-1.5 py-0.5 rounded-md ml-2 font-medium">
                            CRM
                          </span>
                        )}
                      </td>

                      {/* Property */}
                      <td className="p-4 text-[#8E9DB8] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#4B5A75] flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{sale.propertyName || 'Imóvel Avulso'}</span>
                      </td>

                      {/* Date */}
                      <td className="p-4 font-mono text-[#8E9DB8] font-semibold">
                        {new Date(sale.saleDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>

                      {/* VGV */}
                      <td className="p-4 text-right font-mono text-[#8E9DB8] font-medium">
                        {sale.vgv ? formatCurrency(sale.vgv) : '—'}
                      </td>

                      {/* Commission */}
                      <td className="p-4 text-right font-black text-[#10B981] font-mono text-sm">
                        {formatCurrency(sale.commissionValue)}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (sale.paymentStatus || 'Recebido') === 'Recebido'
                            ? 'bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30'
                            : 'bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/30'
                        }`}>
                          {(sale.paymentStatus || 'Recebido') === 'Recebido' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{sale.paymentStatus || 'Recebido'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center pr-6">
                        <button
                          onClick={() => {
                            if (confirm(`Remover permanentemente o registro de comissão de ${sale.clientName}?`)) {
                              onDeleteSale(sale.id);
                            }
                          }}
                          className="p-1.5 hover:bg-[#EF4444]/15 text-[#4B5A75] hover:text-[#EF4444] rounded-[8px] transition-colors cursor-pointer"
                          title="Remover Registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. CREATE SALE MODAL DIALOG */}
      <AnimatePresence>
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-[#060A12]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B1323] border border-[#16243F] rounded-[16px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#080E1A] px-6 py-4 border-b border-[#16243F] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#10B981]/15 text-[#10B981] rounded-[10px] border border-[#10B981]/30">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      Registrar Venda &amp; Comissão
                    </h3>
                    <p className="text-xs text-[#8E9DB8]">Lançamento de honorários no extrato</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-[#8E9DB8] hover:text-white p-1.5 rounded-[10px] hover:bg-[#101B30] transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSale} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Buyer selection mode */}
                <div className="flex items-center gap-2 bg-[#080E1A] p-1 rounded-[10px] w-fit border border-[#16243F]">
                  <button
                    type="button"
                    onClick={() => setClientSelectionType('existing')}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      clientSelectionType === 'existing'
                        ? 'bg-[#1D68FF] text-white shadow-2xs'
                        : 'text-[#8E9DB8] hover:text-white'
                    }`}
                  >
                    Cliente da Carteira (CRM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientSelectionType('custom')}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      clientSelectionType === 'custom'
                        ? 'bg-[#1D68FF] text-white shadow-2xs'
                        : 'text-[#8E9DB8] hover:text-white'
                    }`}
                  >
                    Comprador Avulso
                  </button>
                </div>

                {/* Buyer input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                    Nome do Comprador *
                  </label>
                  {clientSelectionType === 'existing' ? (
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        const c = clients.find(cl => cl.id === e.target.value);
                        if (c?.empreendimento) setPropertyName(c.empreendimento);
                      }}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
                      required
                    >
                      <option value="">Selecione um lead...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Carlos Albuquerque"
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                      required
                    />
                  )}
                </div>

                {/* Property Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                    Empreendimento / Unidade Negociada
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Reserva Imperial - Apto 84"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                  />
                </div>

                {/* VGV & Commission Rate & Commission Value Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                      VGV do Imóvel (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="850000"
                      value={vgvValue}
                      onChange={(e) => handleVgvChange(e.target.value)}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                      Taxa de Comissão (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      value={commissionRate}
                      onChange={(e) => {
                        setCommissionRate(e.target.value);
                        if (vgvValue) {
                          const v = parseFloat(vgvValue);
                          const r = parseFloat(e.target.value);
                          if (!isNaN(v) && !isNaN(r)) {
                            setCommissionValue((v * (r / 100)).toFixed(2));
                          }
                        }
                      }}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                      Sua Comissão (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="25500"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-full text-xs bg-[#080E1A] border border-[#10B981]/40 rounded-[10px] p-2.5 text-[#10B981] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      required
                    />
                  </div>
                </div>

                {/* Date & Payment Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                      Data da Venda *
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                      Status do Recebimento
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-[#1D68FF] cursor-pointer"
                    >
                      <option value="Recebido">Recebido na Conta</option>
                      <option value="A Receber">A Receber (Previsão)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                    Observações Financeiras
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Parcela única via PIX após assinatura da escritura"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] p-2.5 text-white placeholder-[#4B5A75] focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex gap-2 justify-end pt-3 border-t border-[#16243F]">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-[#8E9DB8] font-semibold px-4 py-2 border border-[#16243F] rounded-[10px] hover:bg-[#101B30] hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold px-4 py-2 rounded-[10px] flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 hover:brightness-110"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Confirmar Lançamento</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. ADJUST GOAL MODAL */}
      <AnimatePresence>
        {showGoalModal && (
          <div 
            className="fixed inset-0 bg-[#060A12]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B1323] border border-[#16243F] rounded-[16px] w-full max-w-sm p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#00C7F2]" />
                <h3 className="font-bold text-sm font-display text-white">
                  Definir Meta Mensal de Comissões
                </h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8E9DB8] uppercase tracking-wider block">
                  Valor Desejado no Mês (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B5A75]">R$</span>
                  <input
                    type="number"
                    value={editingTargetInput}
                    onChange={(e) => setEditingTargetInput(e.target.value)}
                    className="w-full text-xs bg-[#080E1A] border border-[#16243F] rounded-[10px] pl-9 pr-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1D68FF]"
                    placeholder="30000"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="text-xs text-[#8E9DB8] font-semibold px-3 py-1.5 rounded-[10px] border border-[#16243F] hover:bg-[#101B30] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="text-xs bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold px-4 py-1.5 rounded-[10px] shadow-md shadow-blue-500/20 cursor-pointer hover:brightness-110"
                >
                  Salvar Meta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
