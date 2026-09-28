import React, { useState, useEffect } from 'react';
import { ClientDocument, DocumentStatus } from '../types';
import { documentService } from '../services';
import { 
  FileText, 
  Eye, 
  Trash2, 
  ExternalLink, 
  Paperclip, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  User, 
  Calendar,
  X,
  FileCheck
} from 'lucide-react';

interface DocumentsTabProps {
  clientId: string;
}

export default function DocumentsTab({ clientId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [activePreviewDoc, setActivePreviewDoc] = useState<ClientDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<ClientDocument | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load documents for client
  const loadDocs = () => {
    const docs = documentService.getClientDocuments(clientId);
    setDocuments(docs);
  };

  useEffect(() => {
    loadDocs();
  }, [clientId]);

  // Stat calculation
  const totalDocsCount = documents.length; // Will be 10
  const receivedDocs = documents.filter(d => d.status === 'Recebido');
  const receivedCount = receivedDocs.length;
  
  // Missing list to display in the alert banner
  const missingDocs = documents.filter(d => d.status === 'Faltando' || d.status === 'Pendente');

  // Convert File to Base64
  const handleFileUpload = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: PDF, JPG, PNG
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.');
      return;
    }

    // Limit size to 10MB to be safe for localstorage
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('O tamanho do arquivo excede o limite de 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const updatedDocs = documentService.uploadDocument(
        clientId,
        docType,
        file.name,
        file.type,
        base64Data
      );
      setDocuments(updatedDocs);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (doc: ClientDocument) => {
    const updatedDocs = documentService.deleteDocument(clientId, doc.documentType);
    setDocuments(updatedDocs);
    setDeleteConfirmDoc(null);
  };

  const handleStatusChange = (docType: string, status: DocumentStatus) => {
    const updatedDocs = documentService.updateDocumentStatus(clientId, docType, status);
    setDocuments(updatedDocs);
  };

  const handleOpenDocument = (doc: ClientDocument) => {
    if (!doc.fileData) return;
    try {
      // Direct opening in window or download fallback
      const newWin = window.open();
      if (newWin) {
        newWin.document.write(
          `<iframe src="${doc.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        newWin.document.title = doc.fileName || doc.documentType;
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = doc.fileData;
        a.download = doc.fileName || `${doc.documentType}.bin`;
        a.click();
      }
    } catch (e) {
      // Direct download if window open fails
      const a = document.createElement('a');
      a.href = doc.fileData;
      a.download = doc.fileName || `${doc.documentType}.bin`;
      a.click();
    }
  };

  return (
    <div className="space-y-6" id="documents-tab-container">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#16243F] pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-[#38BDF8]" />
            Documentos do Cliente
          </h3>
          <p className="text-xs text-[#8E9DB8]">Mantenha a papelada e análise do cliente centralizada</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-[#080E1A] text-white px-3 py-1.5 rounded-[10px] font-semibold border border-[#16243F]">
            Completo: <span className="text-[#38BDF8] font-bold">{receivedCount} de {totalDocsCount}</span>
          </div>
        </div>
      </div>

      {/* Error message banner */}
      {errorMsg && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-[10px] text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto font-bold text-[#8E9DB8] hover:text-white">×</button>
        </div>
      )}

      {/* 2. DYNAMIC SUMMARY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Progress Bar Column */}
        <div className="md:col-span-5 bg-[#0B1323] p-4 rounded-[16px] border border-[#16243F] flex flex-col justify-center space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-white">
            <span>Progresso da Pasta</span>
            <span className="font-bold text-[#38BDF8]">{Math.round((receivedCount / totalDocsCount) * 100)}%</span>
          </div>
          <div className="w-full bg-[#080E1A] h-2.5 rounded-full overflow-hidden border border-[#16243F]">
            <div 
              className="bg-gradient-to-r from-[#1D68FF] to-[#0099FF] h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(29,104,255,0.25)]"
              style={{ width: `${(receivedCount / totalDocsCount) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[#8E9DB8]">
            Envie todos os 10 documentos obrigatórios para obter 100% de conformidade de análise de crédito.
          </p>
        </div>

        {/* Missing List Banner Column */}
        <div className="md:col-span-7 bg-[#0B1323] border border-[#16243F] rounded-[16px] p-4 space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#F59E0B] flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Documentos Pendentes ou Faltantes
          </span>
          {missingDocs.length === 0 ? (
            <p className="text-xs text-white font-semibold">
              ✨ Sensacional! Todos os documentos foram recebidos e estão na pasta do cliente.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missingDocs.map(doc => (
                <span 
                  key={doc.documentType} 
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-[6px] border ${
                    doc.status === 'Pendente'
                      ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                >
                  {doc.documentType} ({doc.status})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. DOCUMENT LISTING TABLE / GRID */}
      <div className="border border-[#16243F] rounded-[16px] overflow-hidden shadow-xs bg-[#0B1323]">
        <div className="bg-[#080E1A] px-4 py-3 border-b border-[#16243F] grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-[#8E9DB8]">
          <div className="col-span-5 md:col-span-4">Nome do Documento</div>
          <div className="col-span-3 md:col-span-2 text-center">Status</div>
          <div className="hidden md:block md:col-span-3">Detalhes do Envio</div>
          <div className="col-span-4 md:col-span-3 text-right">Ações</div>
        </div>

        <div className="divide-y divide-[#16243F] bg-[#0B1323]">
          {documents.map((doc) => {
            const isReceived = doc.status === 'Recebido';
            const isPending = doc.status === 'Pendente';
            const isMissing = doc.status === 'Faltando';

            return (
              <div 
                key={doc.documentType} 
                className="px-4 py-3.5 grid grid-cols-12 items-center gap-2 hover:bg-[#101B30] transition-all"
              >
                {/* Name / Type */}
                <div className="col-span-5 md:col-span-4 flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-[8px] border ${
                    isReceived
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                      : isPending
                      ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block truncate" title={doc.documentType}>
                      {doc.documentType}
                    </span>
                    {doc.fileName && (
                      <span className="text-[10px] text-[#8E9DB8] block max-w-[150px] truncate" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator & Change Dropdown */}
                <div className="col-span-3 md:col-span-2 flex justify-center">
                  <select
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc.documentType, e.target.value as DocumentStatus)}
                    className={`text-[10px] font-semibold rounded-[6px] px-2 py-1 border focus:outline-hidden cursor-pointer ${
                      isReceived
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                        : isPending
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                        : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                    }`}
                  >
                    <option value="Recebido" disabled={!isReceived}>✅ Recebido</option>
                    <option value="Pendente">⏳ Pendente</option>
                    <option value="Faltando">❌ Faltando</option>
                  </select>
                </div>

                {/* Upload Details */}
                <div className="hidden md:flex md:col-span-3 flex-col text-[10px] text-[#8E9DB8] space-y-0.5">
                  {isReceived ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-[#4B5A75]" />
                        <span>{new Date(doc.uploadedAt!).toLocaleDateString('pt-BR')} às {new Date(doc.uploadedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#4B5A75]" />
                        <span>{doc.uploadedBy}</span>
                      </div>
                    </>
                  ) : (
                    <span className="italic text-[#4B5A75]">Aguardando arquivo</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-1">
                  {isReceived ? (
                    <>
                      {/* View Button */}
                      <button
                        onClick={() => setActivePreviewDoc(doc)}
                        className="p-1.5 text-[#8E9DB8] hover:text-[#00C7F2] hover:bg-[#16243F] rounded-[8px] transition-all cursor-pointer"
                        title="Visualizar documento"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Open / Download Button */}
                      <button
                        onClick={() => handleOpenDocument(doc)}
                        className="p-1.5 text-[#8E9DB8] hover:text-[#00C7F2] hover:bg-[#16243F] rounded-[8px] transition-all cursor-pointer"
                        title="Abrir / Baixar documento"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="p-1.5 text-[#4B5A75] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-[8px] transition-all cursor-pointer"
                        title="Excluir documento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Attachment Selector Button */}
                      <label 
                        className="flex items-center gap-1 bg-[#101B30] hover:bg-[#16243F] text-white px-2.5 py-1.5 rounded-[8px] text-[10px] font-semibold cursor-pointer transition-all border border-[#16243F] hover:border-[#1D68FF] shadow-2xs"
                        title="Fazer upload de PDF, JPG ou PNG"
                      >
                        <Paperclip className="h-3 w-3 text-[#38BDF8]" />
                        <span>Anexar</span>
                        <input 
                          type="file" 
                          accept=".pdf, .jpg, .jpeg, .png, image/png, image/jpeg, application/pdf"
                          onChange={(e) => handleFileUpload(doc.documentType, e)}
                          className="hidden" 
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EXPLICIT LIGHTBOX / PREVIEW MODAL */}
      {activePreviewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-[#0B1323] rounded-[16px] w-full max-w-lg overflow-hidden border border-[#16243F] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-[#080E1A] border-b border-[#16243F] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">
                  Visualizar: {activePreviewDoc.documentType}
                </h4>
                <p className="text-[10px] text-[#8E9DB8] font-mono truncate max-w-[250px]" title={activePreviewDoc.fileName}>
                  {activePreviewDoc.fileName}
                </p>
              </div>
              <button 
                onClick={() => setActivePreviewDoc(null)}
                className="p-1 hover:bg-[#101B30] text-[#8E9DB8] hover:text-white rounded-[8px] cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-4 flex-1 bg-[#0B1323] flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
              {activePreviewDoc.fileType?.startsWith('image/') ? (
                <img 
                  src={activePreviewDoc.fileData} 
                  alt={activePreviewDoc.documentType} 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain rounded-[8px] border border-[#16243F] shadow-sm"
                />
              ) : activePreviewDoc.fileType === 'application/pdf' ? (
                /* PDF Visualizer Card with Open buttons as sandbox iframe can block embed/rendering */
                <div className="text-center p-6 bg-[#080E1A] border border-[#16243F] rounded-[12px] max-w-sm shadow-md">
                  <div className="p-4 bg-[#1D68FF]/15 text-[#38BDF8] rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 border border-[#1D68FF]/30">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h5 className="font-bold text-white text-xs mb-1">Arquivo PDF de Análise</h5>
                  <p className="text-[10px] text-[#8E9DB8] mb-4 truncate">{activePreviewDoc.fileName}</p>
                  <button
                    onClick={() => {
                      handleOpenDocument(activePreviewDoc);
                      setActivePreviewDoc(null);
                    }}
                    className="w-full bg-gradient-to-r from-[#1D68FF] to-[#0099FF] text-white font-semibold text-xs py-2 px-3 rounded-[8px] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(29,104,255,0.25)] hover:opacity-95 transition-all cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir PDF em Nova Aba</span>
                  </button>
                </div>
              ) : (
                <div className="text-center p-6 text-xs text-[#8E9DB8]">
                  Pré-visualização não disponível para este formato.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#080E1A] border-t border-[#16243F] flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenDocument(activePreviewDoc);
                  setActivePreviewDoc(null);
                }}
                className="px-3 py-1.5 border border-[#16243F] rounded-[8px] text-[10px] font-semibold text-[#8E9DB8] hover:text-white hover:bg-[#101B30] transition-all cursor-pointer"
              >
                Abrir Externo
              </button>
              <button
                onClick={() => setActivePreviewDoc(null)}
                className="px-3 py-1.5 bg-[#101B30] hover:bg-[#16243F] rounded-[8px] text-[10px] font-semibold text-white transition-all cursor-pointer border border-[#16243F]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE DIALOG MODAL */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-[#0B1323] rounded-[16px] w-full max-w-sm overflow-hidden border border-[#16243F] flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-[#EF4444]">
              <div className="p-2 bg-[#EF4444]/10 rounded-[10px] border border-[#EF4444]/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Excluir Documento?</h4>
            </div>
            
            <p className="text-xs text-[#8E9DB8] leading-relaxed">
              Tem certeza de que deseja remover o arquivo <strong className="text-white font-bold">{deleteConfirmDoc.fileName}</strong> do documento <strong className="text-white font-bold">{deleteConfirmDoc.documentType}</strong>? O status do documento retornará para "Faltando".
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 border border-[#16243F] rounded-[10px] text-xs font-semibold text-[#8E9DB8] hover:text-white hover:bg-[#101B30] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmDoc)}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-[10px] text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
