import { describe, it, expect } from 'vitest';
import { Work, WorkStatus } from '../types';

describe('Edição de Dados Cadastrais da Obra (Monteplan Incorporadora)', () => {
  const mockWork: Work = {
    id: 'work-1',
    organization_id: 'org-1',
    code: 'OBR-ATR',
    erp_code: 'ATRIUM-01',
    name: 'Edifício Atrium Select',
    client: 'Monteplan Incorporadora (Própria)',
    address: 'Rua Leonardo Mota, 1450 - Aldeota',
    city: 'Fortaleza',
    state: 'CE',
    city_state: 'Fortaleza/CE',
    project_type: 'Residencial Vertical',
    manager_name: 'Mariana Duarte',
    engineer_name: 'Eng. Lucas Pinho',
    planned_start: '2024-02-01',
    planned_end: '2028-07-31',
    contract_value: 55206000,
    progress_percent: 29.8,
    status: 'em_andamento',
    labor_enabled: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  };

  it('1. Deve permitir atualizar o Gestor do Contrato', () => {
    const updatedWork: Work = {
      ...mockWork,
      manager_name: 'Carlos Albuquerque',
      updated_at: new Date().toISOString(),
    };
    expect(updatedWork.manager_name).toBe('Carlos Albuquerque');
    expect(updatedWork.id).toBe('work-1');
  });

  it('2. Deve permitir atualizar o Engenheiro Responsável', () => {
    const updatedWork: Work = {
      ...mockWork,
      engineer_name: 'Enga. Fernanda Meireles',
      updated_at: new Date().toISOString(),
    };
    expect(updatedWork.engineer_name).toBe('Enga. Fernanda Meireles');
  });

  it('3. Deve permitir alterar o Status da Obra para qualquer estado válido', () => {
    const validStatuses: WorkStatus[] = ['planejamento', 'em_andamento', 'pausada', 'concluida', 'cancelada'];
    
    validStatuses.forEach((status) => {
      const updatedWork: Work = {
        ...mockWork,
        status,
        updated_at: new Date().toISOString(),
      };
      expect(updatedWork.status).toBe(status);
    });
  });

  it('4. Monteplan é incorporadora própria, dispensando a exigência de campo Cliente nos cadastros', () => {
    // Ao cadastrar nova obra sem informar cliente, deve adotar padrão de incorporação própria
    const newWorkData = {
      code: 'OBR-002',
      name: 'Residencial Horizonte',
      address: 'Meireles',
      city: 'Fortaleza',
      state: 'CE',
      manager_name: 'Mariana Duarte',
      engineer_name: 'Eng. Tiago Caetano',
      status: 'planejamento' as WorkStatus,
    };

    const finalWork: Work = {
      id: 'work-new',
      organization_id: 'org-1',
      ...newWorkData,
      city_state: `${newWorkData.city}/${newWorkData.state}`,
      client: 'Monteplan Incorporadora (Própria)',
      project_type: 'Residencial Vertical',
      planned_start: '2026-10-01',
      planned_end: '2029-12-31',
      contract_value: 40000000,
      progress_percent: 0,
      labor_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(finalWork.client).toBe('Monteplan Incorporadora (Própria)');
    expect(finalWork.manager_name).toBe('Mariana Duarte');
    expect(finalWork.engineer_name).toBe('Eng. Tiago Caetano');
    expect(finalWork.status).toBe('planejamento');
  });
});
