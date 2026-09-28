import React, { useState, useMemo } from 'react';
import {
  ATRIUM_DEPARA_RULES,
  ATRIUM_OBRA_ACCOUNTS,
  ATRIUM_DRE_LINES,
  isConstructionAccount,
} from '../../lib/atrium-dre-data';
import { logAudit } from '../../lib/supabase';
import {
  ArrowRightLeft,
  Search,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Info,
} from 'lucide-react';

export type EscopoType = 'Custo de Obra' | 'DRE / Corporativo';

export interface DeParaRuleItem {
  origem: string;
  destino: string;
  escopo?: EscopoType;
}

export const DeParaMatrixSettings: React.FC = () => {

  // Matriz De-Para Editável com Persistência
  const [deparaRules, setDeparaRules] = useState<DeParaRuleItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_custom_depara_rules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading custom depara rules', e);
    }
    return ATRIUM_DEPARA_RULES.map((r) => ({
      ...r,
      escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
    }));
  });

  const [savedBaseline, setSavedBaseline] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('atrium_custom_depara_rules');
      if (saved) return saved;
    } catch {}
    return JSON.stringify(
      ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }))
    );
  });

  const [deparaSearch, setDeparaSearch] = useState('');
  const [isSavingDepara, setIsSavingDepara] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Lista de Contas DRE / Orçamento para Sugestão Automática
  const destinationAccountOptions = useMemo(() => {
    const set = new Set<string>();
    ATRIUM_DEPARA_RULES.forEach((r) => {
      if (r.destino && r.destino !== '-') set.add(r.destino);
    });
    ATRIUM_OBRA_ACCOUNTS.forEach((a) => set.add(a));
    ATRIUM_DRE_LINES.forEach((l) => {
      if (!l.isGroup) set.add(l.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const modifiedCount = useMemo(() => {
    let count = 0;
    let baselineRules: DeParaRuleItem[] = [];
    try {
      baselineRules = JSON.parse(savedBaseline);
    } catch {
      baselineRules = ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }));
    }
    const baselineMap = new Map(
      baselineRules.map((r) => [
        r.origem,
        { destino: r.destino, escopo: r.escopo || (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') },
      ])
    );
    deparaRules.forEach((r) => {
      const base = baselineMap.get(r.origem);
      const curEscopo = r.escopo || (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo');
      if (!base || base.destino !== r.destino || base.escopo !== curEscopo) {
        count++;
      }
    });
    if (deparaRules.length !== baselineRules.length) {
      count += Math.abs(deparaRules.length - baselineRules.length);
    }
    return count;
  }, [deparaRules, savedBaseline]);

  const hasUnsavedChanges = useMemo(() => {
    return modifiedCount > 0;
  }, [modifiedCount]);

  const handleUpdateRule = (index: number, field: 'destino' | 'escopo', value: string) => {
    setDeparaRules((prev) => {
      const next = [...prev];
      const current = next[index];
      if (field === 'destino') {
        const autoEscopo = (isConstructionAccount(value) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType;
        next[index] = {
          ...current,
          destino: value,
          escopo: current.escopo || autoEscopo,
        };
      } else if (field === 'escopo') {
        next[index] = {
          ...current,
          escopo: value as EscopoType,
        };
      }
      return next;
    });
  };

  const handleAddRule = () => {
    setDeparaRules((prev) => [
      { origem: `Conta ERP Adicional #${prev.length + 1}`, destino: 'Salários - Obra', escopo: 'Custo de Obra' },
      ...prev,
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setDeparaRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDepara = () => {
    setIsSavingDepara(true);
    try {
      const json = JSON.stringify(deparaRules);
      localStorage.setItem('atrium_custom_depara_rules', json);
      setSavedBaseline(json);
      logAudit(
        'UPDATE_DEPARA_MATRIX',
        'atrium_depara',
        'work-1',
        `Matriz De-Para salva pelo gestor com ${deparaRules.length} regras vinculadas.`
      );
      setSaveSuccessMessage(
        `Matriz De-Para salva com sucesso! ${deparaRules.length} regras mapeadas estão ativas.`
      );
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar a matriz de-para no armazenamento local.');
    } finally {
      setIsSavingDepara(false);
    }
  };

  const handleResetDeparaToOfficial = () => {
    if (
      window.confirm(
        'Tem certeza que deseja restaurar a Matriz De-Para original oficial com as 86 contas sintéticas da DRE / Obra?'
      )
    ) {
      const originalRules = ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }));
      setDeparaRules(originalRules);
      localStorage.removeItem('atrium_custom_depara_rules');
      setSavedBaseline(JSON.stringify(originalRules));
      logAudit(
        'RESET_DEPARA_MATRIX',
        'atrium_depara',
        'work-1',
        'Matriz De-Para restaurada para o padrão oficial da Monteplan.'
      );
      setSaveSuccessMessage('Matriz restaurada para o padrão oficial com sucesso.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  // Filtragem
  const filteredDeparaWithIndex = useMemo(() => {
    return deparaRules
      .map((rule, originalIndex) => ({ ...rule, originalIndex }))
      .filter((rule) => {
        if (!deparaSearch) return true;
        const s = deparaSearch.toLowerCase();
        return (
          rule.origem.toLowerCase().includes(s) ||
          rule.destino.toLowerCase().includes(s) ||
          (rule.escopo && rule.escopo.toLowerCase().includes(s))
        );
      });
  }, [deparaRules, deparaSearch]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Explicativo: Contas de Obra vs Contas da DRE */}
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Contas Exclusivas do Orçamento da Obra ({ATRIUM_OBRA_ACCOUNTS.length} Contas)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Estas 47 contas compõem o <strong>Custo de Obra / Orçamento Técnico de Engenharia (R$ 25.705.359,47)</strong>, vinculadas diretamente às 23 etapas da EAP.
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-2 pt-1">
            {ATRIUM_OBRA_ACCOUNTS.map((acc, idx) => (
              <div key={idx} className="text-[11px] px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                {acc}
              </div>
            ))}
          </div>
        </div>

        {/* Card Explicativo: Contas que NÃO Entram na Obra */}
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Info className="w-4 h-4" />
            <span>Contas que NÃO Participam da Obra (Exclusivas da DRE / Resultado)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Não entram no custo de engenharia: Receitas de vendas, impostos de faturamento (PIS, COFINS, IRPJ, CSLL), comissões de corretores, publicidade, honorários advocatícios e despesas corporativas da sede.
          </p>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div>• <strong>Receitas:</strong> Venda de Unidades (VGV R$ 55,2M)</div>
            <div>• <strong>Deduções Tributárias:</strong> PIS, COFINS, CSLL, IRPJ, Distratos</div>
            <div>• <strong>Despesas Comerciais & MKT:</strong> Campanhas, Publicidade, Stand Conservação</div>
            <div>• <strong>Comissões:</strong> Corretores de Imóveis</div>
            <div>• <strong>Administração Central:</strong> Tarifas Bancárias, Multas Sede, Diretoria</div>
          </div>
        </div>
      </div>

      {/* Datalist com Todas as Opções Oficiais de Contas para Autocompletar */}
      <datalist id="dre-destination-accounts-settings">
        {destinationAccountOptions.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>

      {/* Tabela da Matriz De-Para Completa com Edição na Hora */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-0 shadow-lg">
        {/* Header do Card */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriz De-Para: Lançamento Bruto ERP → Conta Ajustada DRE / Obra (86 Contas)
              </h3>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  {modifiedCount} {modifiedCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mapeamento oficial que unifica os lançamentos contábeis nas 86 contas sintéticas da DRE e Orçamento da Obra.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleAddRule}
              className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Adicionar uma nova regra de mapeamento de conta do ERP"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Regra</span>
            </button>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={deparaSearch}
                onChange={(e) => setDeparaSearch(e.target.value)}
                placeholder="Filtrar origem ou destino..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Regras com Edição em Tempo Real */}
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-2/5">Conta de Origem no ERP (Extrato)</th>
                <th className="p-3 w-2/5">Conta Ajustada DRE / Orçamento (Editável)</th>
                <th className="p-3 text-center w-48">Tipo de Escopo (Editável)</th>
                <th className="p-3 w-12 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {filteredDeparaWithIndex.map((rule) => {
                const currentEscopo = rule.escopo || (isConstructionAccount(rule.destino) ? 'Custo de Obra' : 'DRE / Corporativo');
                const isObra = currentEscopo === 'Custo de Obra';

                return (
                  <tr key={rule.originalIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-slate-400 text-[10px] text-center font-mono">
                      {rule.originalIndex + 1}
                    </td>
                    <td className="p-3">
                      <span
                        className="font-mono text-xs text-slate-800 dark:text-slate-200 select-all font-medium"
                        title="Conta de origem no ERP (Extrato) - Fixa / Não editável"
                      >
                        {rule.origem}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="relative flex items-center w-full">
                        <input
                          type="text"
                          list="dre-destination-accounts-settings"
                          value={rule.destino}
                          onChange={(e) => handleUpdateRule(rule.originalIndex, 'destino', e.target.value)}
                          className="w-full font-semibold text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 focus:bg-white dark:focus:bg-slate-900 border border-blue-200/80 dark:border-blue-800/40 focus:border-blue-500 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                          placeholder="Selecione ou digite a conta de destino..."
                          title="Altere na hora a conta de destino ajustada para a DRE e Obra"
                        />
                        <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center justify-center">
                        <select
                          value={currentEscopo}
                          onChange={(e) => handleUpdateRule(rule.originalIndex, 'escopo', e.target.value)}
                          className={`text-[11px] font-bold rounded-full px-3 py-1 cursor-pointer border shadow-sm outline-none transition-all ${
                            isObra
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200/80 dark:hover:bg-purple-900/60'
                          }`}
                          title="Clique para alterar o Tipo de Escopo desta regra"
                        >
                          <option value="Custo de Obra" className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold py-1">
                            ● Custo de Obra
                          </option>
                          <option value="DRE / Corporativo" className="bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 font-bold py-1">
                            ● DRE / Corporativo
                          </option>
                        </select>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveRule(rule.originalIndex)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                        title="Excluir regra de mapeamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredDeparaWithIndex.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    Nenhuma regra De-Para encontrada para o termo "{deparaSearch}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Card com Ações */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Total: <strong>{deparaRules.length}</strong> regras mapeadas
            </span>

            {hasUnsavedChanges ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{modifiedCount} alterações não salvas</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mapeamento atualizado e salvo</span>
              </span>
            )}

            {saveSuccessMessage && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md animate-in fade-in slide-in-from-left-2">
                ✓ {saveSuccessMessage}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetDeparaToOfficial}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
              title="Restaurar todas as regras para o padrão de fábrica da planilha oficial"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão Oficial</span>
            </button>

            <button
              onClick={handleSaveDepara}
              disabled={isSavingDepara || !hasUnsavedChanges}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer animate-pulse'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
              title={hasUnsavedChanges ? 'Salvar alterações na Matriz De-Para' : 'Nenhuma alteração pendente'}
            >
              <Save className="w-4 h-4" />
              <span>{isSavingDepara ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
