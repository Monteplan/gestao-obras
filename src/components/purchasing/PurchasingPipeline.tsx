import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { PurchaseOrder, PurchaseRequisition, Receipt } from '../../types';
import { formatBRL, formatDateBR } from '../../lib/utils';
import {
  ShoppingCart,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  FileCheck,
  Building2,
  X,
} from 'lucide-react';

export const PurchasingPipeline: React.FC = () => {
  const {
    works,
    requisitions,
    orders,
    receipts,
    addRequisition,
    updateRequisitionStatus,
    addPurchaseOrder,
    updateOrderStatus,
    addReceipt,
  } = useData();
  const { canEdit } = useAuth();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'requisicoes' | 'pedidos' | 'recebimentos'>('pipeline');
  const [showReqModal, setShowReqModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReqForOrder, setSelectedReqForOrder] = useState<PurchaseRequisition | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<PurchaseOrder | null>(null);

  // Form Requisição
  const [reqForm, setReqForm] = useState({
    work_id: works[0]?.id || '',
    requester_name: '',
    request_date: new Date().toISOString().split('T')[0],
    priority: 'media' as PurchaseRequisition['priority'],
    justification: '',
    total_estimated: 10000,
  });

  // Form Pedido
  const [orderForm, setOrderForm] = useState({
    work_id: works[0]?.id || '',
    supplier_name: '',
    supplier_cnpj: '',
    cost_center: 'CC-GERAL',
    order_date: new Date().toISOString().split('T')[0],
    delivery_forecast: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    total_amount: 10000,
    status: 'enviado' as PurchaseOrder['status'],
    notes: '',
  });

  // Form Recebimento
  const [receiptForm, setReceiptForm] = useState({
    work_id: works[0]?.id || '',
    order_id: '',
    invoice_number: '',
    receipt_date: new Date().toISOString().split('T')[0],
    received_value: 0,
    is_partial: false,
    discrepancies: '',
    notes: '',
  });

  const today = new Date().toISOString().split('T')[0];

  // Pipeline Counts & Totais
  const pendingRequisitions = requisitions.filter((r) => r.status === 'enviada');
  const approvedRequisitions = requisitions.filter((r) => r.status === 'aprovada');
  const openOrders = orders.filter((o) => ['aprovado', 'enviado', 'parcialmente_recebido', 'atrasado'].includes(o.status));
  const delayedOrders = orders.filter((o) => o.status === 'atrasado' || (o.delivery_forecast < today && o.status !== 'recebido'));
  const receivedOrders = orders.filter((o) => o.status === 'recebido');

  const totalCommittedValue = openOrders.reduce((acc, o) => acc + o.total_amount, 0);

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    addRequisition({
      work_id: reqForm.work_id,
      requester_name: reqForm.requester_name,
      request_date: reqForm.request_date,
      priority: reqForm.priority,
      justification: reqForm.justification,
      total_estimated: Number(reqForm.total_estimated),
      status: 'enviada',
    });
    setShowReqModal(false);
  };

  const handleCreateOrderFromReq = (req: PurchaseRequisition) => {
    setSelectedReqForOrder(req);
    setOrderForm({
      work_id: req.work_id,
      supplier_name: '',
      supplier_cnpj: '',
      cost_center: 'CC-OBRA',
      order_date: new Date().toISOString().split('T')[0],
      delivery_forecast: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      total_amount: req.total_estimated || 5000,
      status: 'enviado',
      notes: `Gerado a partir da requisição ${req.internal_number}`,
    });
    setShowOrderModal(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    addPurchaseOrder({
      work_id: orderForm.work_id,
      requisition_id: selectedReqForOrder?.id,
      supplier_name: orderForm.supplier_name,
      supplier_cnpj: orderForm.supplier_cnpj,
      cost_center: orderForm.cost_center,
      order_date: orderForm.order_date,
      delivery_forecast: orderForm.delivery_forecast,
      total_amount: Number(orderForm.total_amount),
      status: orderForm.status,
      notes: orderForm.notes,
    });

    if (selectedReqForOrder) {
      updateRequisitionStatus(selectedReqForOrder.id, 'atendida');
    }
    setShowOrderModal(false);
  };

  const handleOpenReceiptForOrder = (order: PurchaseOrder) => {
    setSelectedOrderForReceipt(order);
    setReceiptForm({
      work_id: order.work_id,
      order_id: order.id,
      invoice_number: `NF-${Math.floor(10000 + Math.random() * 90000)}`,
      receipt_date: new Date().toISOString().split('T')[0],
      received_value: order.total_amount,
      is_partial: false,
      discrepancies: '',
      notes: `Recebimento total do pedido ${order.internal_number}`,
    });
    setShowReceiptModal(true);
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    addReceipt({
      work_id: receiptForm.work_id,
      order_id: receiptForm.order_id,
      invoice_number: receiptForm.invoice_number,
      receipt_date: receiptForm.receipt_date,
      received_value: Number(receiptForm.received_value),
      is_partial: receiptForm.is_partial,
      discrepancies: receiptForm.discrepancies,
      notes: receiptForm.notes,
    });
    setShowReceiptModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header do Módulo de Compras */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Compras & Suprimentos</h2>
          <p className="text-xs text-slate-400 mt-1">
            Fluxo completo: Requisição → Aprovação → Pedido de Compra → Recebimento Físico/Fiscal → Custo Incorrido.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canEdit('purchasing') && (
            <button
              onClick={() => setShowReqModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Requisição</span>
            </button>
          )}

          {/* Abas */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg font-semibold ${
                activeTab === 'pipeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pipeline Visual
            </button>
            <button
              onClick={() => setActiveTab('requisicoes')}
              className={`px-3 py-1.5 rounded-lg font-semibold ${
                activeTab === 'requisicoes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Requisições ({requisitions.length})
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-3 py-1.5 rounded-lg font-semibold ${
                activeTab === 'pedidos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pedidos ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('recebimentos')}
              className={`px-3 py-1.5 rounded-lg font-semibold ${
                activeTab === 'recebimentos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recebimentos ({receipts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Faixa de Destaques de Suprimentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-slate-400 block font-medium">Comprometido em Pedidos Ativos</span>
          <strong className="text-lg font-black text-white mt-1 block">{formatBRL(totalCommittedValue)}</strong>
          <span className="text-[10px] text-slate-500">{openOrders.length} pedido(s) em aberto</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-slate-400 block font-medium">Pedidos com Entrega Atrasada</span>
          <strong className="text-lg font-black text-red-400 mt-1 block">{delayedOrders.length} pedido(s)</strong>
          <span className="text-[10px] text-slate-500">Atraso de fornecedor detectado</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-slate-400 block font-medium">Requisições Pendentes</span>
          <strong className="text-lg font-black text-amber-400 mt-1 block">{pendingRequisitions.length} solicitação(ões)</strong>
          <span className="text-[10px] text-slate-500">Aguardando aprovação da gerência</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-slate-400 block font-medium">Recebimentos Realizados</span>
          <strong className="text-lg font-black text-emerald-400 mt-1 block">{receipts.length} NF(s) conferida(s)</strong>
          <span className="text-[10px] text-slate-500">Conciliadas com custos incorridos</span>
        </div>
      </div>

      {/* VISÃO 1: PIPELINE KANBAN INTERATIVO */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Coluna 1: Requisições */}
          <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">1. Requisições</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 font-bold text-[10px]">
                {requisitions.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {requisitions.map((req) => {
                const work = works.find((w) => w.id === req.work_id);
                return (
                  <div key={req.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-400 text-[10px]">{req.internal_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        req.status === 'aprovada' ? 'bg-emerald-500/20 text-emerald-400' :
                        req.status === 'enviada' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-slate-200 font-medium line-clamp-2">{req.justification}</p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>{work?.code}</span>
                      <strong className="text-slate-200">{formatBRL(req.total_estimated)}</strong>
                    </div>

                    {/* Ação de Aprovação / Transformar em Pedido */}
                    {canEdit('purchasing') && req.status === 'enviada' && (
                      <button
                        onClick={() => updateRequisitionStatus(req.id, 'aprovada')}
                        className="w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-[10px] transition-colors"
                      >
                        Aprovar Requisição
                      </button>
                    )}

                    {canEdit('purchasing') && req.status === 'aprovada' && (
                      <button
                        onClick={() => handleCreateOrderFromReq(req)}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center space-x-1"
                      >
                        <span>Gerar Pedido</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna 2: Pedidos Emitidos / Enviados */}
          <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">2. Pedidos Ativos</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-bold text-[10px]">
                {openOrders.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {openOrders.map((order) => {
                const isDelayed = order.status === 'atrasado' || (order.delivery_forecast < today && order.status !== 'recebido');
                const work = works.find((w) => w.id === order.work_id);

                return (
                  <div key={order.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400 text-[10px]">{order.internal_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {isDelayed ? 'Atrasado' : order.status}
                      </span>
                    </div>

                    <p className="text-slate-200 font-bold">{order.supplier_name}</p>
                    <div className="text-[10px] text-slate-400">
                      Entrega Prevista: <strong className="text-slate-200">{formatDateBR(order.delivery_forecast)}</strong>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>{work?.code}</span>
                      <strong className="text-cyan-400 font-bold">{formatBRL(order.total_amount)}</strong>
                    </div>

                    {canEdit('purchasing') && (
                      <button
                        onClick={() => handleOpenReceiptForOrder(order)}
                        className="w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-[10px] transition-colors flex items-center justify-center space-x-1"
                      >
                        <Package className="w-3 h-3" />
                        <span>Confirmar Recebimento</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna 3: Recebimentos e Notas Fiscais */}
          <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">3. Recebimentos (NF)</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px]">
                {receipts.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {receipts.map((rec) => {
                const work = works.find((w) => w.id === rec.work_id);
                return (
                  <div key={rec.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 text-[10px]">{rec.invoice_number}</span>
                      <span className="text-[10px] text-slate-400">{formatDateBR(rec.receipt_date)}</span>
                    </div>

                    <p className="text-slate-300 text-[11px]">{rec.notes || 'Recebimento de materiais no canteiro'}</p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>{work?.code}</span>
                      <strong className="text-emerald-400 font-bold">{formatBRL(rec.received_value)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna 4: Custo Incorrido Realizado */}
          <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">4. Custo Incorrido</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                Automático
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-slate-300">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Integração Imediata</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Todo recebimento validado e toda planilha importada do ERP alimenta o extrato de custos incorridos da obra, garantindo conciliação sem duplicidade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISÃO 2: TABELA DE REQUISIÇÕES */}
      {activeTab === 'requisicoes' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Número</th>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Justificativa</th>
                  <th className="p-3 text-right">Valor Estimado</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requisitions.map((req) => {
                  const work = works.find((w) => w.id === req.work_id);
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-blue-400">{req.internal_number}</td>
                      <td className="p-3">{work?.name}</td>
                      <td className="p-3">{req.requester_name}</td>
                      <td className="p-3 text-slate-400">{formatDateBR(req.request_date)}</td>
                      <td className="p-3 max-w-xs truncate text-slate-200">{req.justification}</td>
                      <td className="p-3 text-right font-bold text-slate-200">{formatBRL(req.total_estimated)}</td>
                      <td className="p-3 text-center capitalize">{req.status}</td>
                      <td className="p-3 text-right">
                        {canEdit('purchasing') && req.status === 'aprovada' && (
                          <button
                            onClick={() => handleCreateOrderFromReq(req)}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[10px]"
                          >
                            Gerar Pedido
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO 3: TABELA DE PEDIDOS */}
      {activeTab === 'pedidos' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Número Pedido</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Data Pedido</th>
                  <th className="p-3">Previsão Entrega</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((o) => {
                  const work = works.find((w) => w.id === o.work_id);
                  return (
                    <tr key={o.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-cyan-400">{o.internal_number}</td>
                      <td className="p-3 font-semibold text-white">{o.supplier_name}</td>
                      <td className="p-3">{work?.name}</td>
                      <td className="p-3 text-slate-400">{formatDateBR(o.order_date)}</td>
                      <td className="p-3 text-slate-400">{formatDateBR(o.delivery_forecast)}</td>
                      <td className="p-3 text-right font-bold text-slate-200">{formatBRL(o.total_amount)}</td>
                      <td className="p-3 text-center capitalize">{o.status.replace('_', ' ')}</td>
                      <td className="p-3 text-right">
                        {canEdit('purchasing') && o.status !== 'recebido' && (
                          <button
                            onClick={() => handleOpenReceiptForOrder(o)}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]"
                          >
                            Receber
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO 4: TABELA DE RECEBIMENTOS */}
      {activeTab === 'recebimentos' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Nota Fiscal / Doc</th>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Data Recebimento</th>
                  <th className="p-3">Observações / Divergências</th>
                  <th className="p-3 text-right">Valor Recebido</th>
                  <th className="p-3 text-center">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {receipts.map((rec) => {
                  const work = works.find((w) => w.id === rec.work_id);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-emerald-400">{rec.invoice_number}</td>
                      <td className="p-3 font-semibold text-white">{work?.name}</td>
                      <td className="p-3 text-slate-400">{formatDateBR(rec.receipt_date)}</td>
                      <td className="p-3 text-slate-300">{rec.notes || '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">{formatBRL(rec.received_value)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                          {rec.is_partial ? 'Parcial' : 'Total'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Nova Requisição */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Nova Requisição de Compra</h3>
              <button onClick={() => setShowReqModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Obra Destino *</label>
                <select
                  value={reqForm.work_id}
                  onChange={(e) => setReqForm({ ...reqForm, work_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900">{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Solicitante *</label>
                <input
                  type="text"
                  required
                  value={reqForm.requester_name}
                  onChange={(e) => setReqForm({ ...reqForm, requester_name: e.target.value })}
                  placeholder="Nome do engenheiro ou encarregado"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Prioridade</label>
                <select
                  value={reqForm.priority}
                  onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  <option value="baixa" className="bg-slate-900">Baixa</option>
                  <option value="media" className="bg-slate-900">Média</option>
                  <option value="alta" className="bg-slate-900">Alta</option>
                  <option value="urgente" className="bg-slate-900">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificativa & Itens *</label>
                <textarea
                  rows={3}
                  required
                  value={reqForm.justification}
                  onChange={(e) => setReqForm({ ...reqForm, justification: e.target.value })}
                  placeholder="Ex: Cimento CP-II 320 sacos para laje do pavimento 14"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor Estimado (R$)</label>
                <input
                  type="number"
                  step="any"
                  value={reqForm.total_estimated}
                  onChange={(e) => setReqForm({ ...reqForm, total_estimated: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Salvar Requisição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pedido de Compra */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Emitir Pedido de Compra</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fornecedor *</label>
                <input
                  type="text"
                  required
                  value={orderForm.supplier_name}
                  onChange={(e) => setOrderForm({ ...orderForm, supplier_name: e.target.value })}
                  placeholder="Ex: Gerdau Aços Longos"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ Fornecedor</label>
                  <input
                    type="text"
                    value={orderForm.supplier_cnpj}
                    onChange={(e) => setOrderForm({ ...orderForm, supplier_cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Previsão Entrega *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.delivery_forecast}
                    onChange={(e) => setOrderForm({ ...orderForm, delivery_forecast: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={orderForm.total_amount}
                  onChange={(e) => setOrderForm({ ...orderForm, total_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl glass-input font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Emitir Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recebimento */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Recebimento Físico & Fiscal</h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número da Nota Fiscal *</label>
                <input
                  type="text"
                  required
                  value={receiptForm.invoice_number}
                  onChange={(e) => setReceiptForm({ ...receiptForm, invoice_number: e.target.value })}
                  placeholder="NF-e 045.120"
                  className="w-full px-3 py-2 rounded-xl glass-input font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Recebimento *</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.receipt_date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Recebido (R$) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={receiptForm.received_value}
                    onChange={(e) => setReceiptForm({ ...receiptForm, received_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl glass-input font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações de Conferência</label>
                <textarea
                  rows={2}
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  placeholder="Mercadoria conferida sem avarias..."
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                Ao salvar, o sistema registrará o recebimento e gerará automaticamente o lançamento de Custo Incorrido correspondente.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
