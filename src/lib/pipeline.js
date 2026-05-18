const DEFAULT_STAGES = [
  { id: 'new', label: 'Nouveau', color: '#2563EB', sla_hours: 2 },
  { id: 'contacted', label: 'Contacté', color: '#F59E0B', sla_hours: 48 },
  { id: 'interested', label: 'Intéressé', color: '#10B981', sla_hours: 24 },
  { id: 'demo', label: 'Démo planifiée', color: '#8B5CF6', sla_hours: 72 },
  { id: 'negotiation', label: 'Négociation', color: '#EC4899', sla_hours: 168 },
  { id: 'closed_won', label: 'Vendu', color: '#22C55E', sla_hours: null },
  { id: 'closed_lost', label: 'Perdu', color: '#6B7280', sla_hours: null },
];

function createPipeline(companyId, name) {
  return {
    id: `p-${companyId}`,
    name: name || `${companyId} Sales Pipeline`,
    company_id: companyId,
    created_at: new Date().toISOString(),
    stages: DEFAULT_STAGES,
    default_stage: 'new',
  };
}

module.exports = { DEFAULT_STAGES, createPipeline };
