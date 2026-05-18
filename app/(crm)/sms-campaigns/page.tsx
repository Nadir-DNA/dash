'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, Send, Smartphone, RefreshCw, Plus, ChevronRight, CheckCircle2, Clock, MessageCircle } from 'lucide-react'
import { KpiCard } from '@/components/ui/kpi-card'

interface Campaign {
  id: string; name: string; status: string; channel: string
  sent_count: number; created_at: string; source: string
}

interface Batch {
  id: string; campaign_id: string; name: string; status: string
  total_count: number; sent_count: number; reply_count: number
  city_filter: string | null; profession_filter: string | null
  created_at: string
}

function statusStyle(s: string) {
  const map: Record<string,string> = {
    draft: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
    ready: 'bg-[rgba(99,102,241,0.1)] text-[#818cf8]',
    sending: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    done: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
  }
  return map[s] || map.draft
}
function statusLabel(s: string) {
  return { draft:'Brouillon', ready:'Prêt', sending:'En cours', done:'Terminé' }[s] || s
}
function fmtDate(d: string) {
  if(!d) return '—'
  try{return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return d}
}

export default function SmsOverviewPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load SMS campaigns + their batches
      const [campRes, batchRes] = await Promise.all([
        fetch('/api/sms-campaigns'),
        fetch('/api/sms-batches'),
      ])
      const campData = await campRes.json()
      const batchData = await batchRes.json()
      setCampaigns(campData.campaigns || [])
      setBatches(batchData.batches || [])
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const totalBatches = batches.length
  const activeBatches = batches.filter(b => b.status === 'sending').length
  const totalTargets = batches.reduce((s,b) => s + b.total_count, 0)
  const totalSent = batches.reduce((s,b) => s + b.sent_count, 0)
  const totalReplies = batches.reduce((s,b) => s + b.reply_count, 0)

  if(loading && !campaigns.length) return (
    <div className="flex items-center justify-center h-96 animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] rounded-full border-t-transparent" />
        <span className="text-sm text-[var(--color-text-tertiary)]">Chargement...</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--color-text-tertiary)' }}>Campagnes SMS</h2>
          <p style={{ fontSize:12, color:'var(--color-text-tertiary)', marginTop:4 }}>Suivi des envois Amens — batches de prospection</p>
        </div>
        <button onClick={loadData} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:11, fontWeight:500, borderRadius:8, border:'1px solid var(--color-border)', color:'var(--color-text-secondary)', background:'transparent', cursor:'pointer' }}>
          <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
        </button>
      </div>

      {/* KPI Strip */}
      <div className="kpi-grid stagger-fade">
        <KpiCard label="Campagnes" value={campaigns.length} description={`${batches.length} batches`} showCircular={false} />
        <KpiCard label="Batches" value={totalBatches} description={`${activeBatches} en cours`} showCircular={false} />
        <KpiCard label="Contacts ciblés" value={totalTargets} description={`${totalSent} envoyés`} showCircular={false} />
        <KpiCard label="Réponses GO" value={totalReplies} description={totalSent > 0 ? `${Math.round(totalReplies/totalSent*100)}% taux` : '—'} showCircular={false} />
      </div>

      {/* Batches list grouped by campaign */}
      <div className="space-y-4">
        {campaigns.map(camp => {
          const campBatches = batches.filter(b => b.campaign_id === camp.id)
          if (campBatches.length === 0 && camp.source === 'supabase') return null // hide historic campaigns without batches
          return (
            <div key={camp.id} className="chart-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)]">{camp.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded ${statusStyle(camp.status)}`}>{camp.status === 'active' ? 'Actif' : camp.status}</span>
                </div>
                <Link href={`/campaigns/${camp.id}`} style={{ fontSize:11, color:'var(--color-text-tertiary)', textDecoration:'none' }}>
                  Voir →
                </Link>
              </div>

              {campBatches.length === 0 && camp.source !== 'supabase' && (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-3">Aucun batch dans cette campagne</p>
                  <Link href={`/batches/new?campaign_id=${camp.id}`} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', fontSize:11, fontWeight:500, borderRadius:8, background:'var(--color-accent)', color:'var(--color-bg)', textDecoration:'none' }}>
                    <Plus className="w-3.5 h-3.5" /> Nouveau batch
                  </Link>
                </div>
              )}

              {campBatches.length > 0 && (
                <div className="space-y-2">
                  {campBatches.map(batch => (
                    <Link key={batch.id} href={`/batches/${batch.id}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:8, border:'1px solid var(--color-border)', textDecoration:'none', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div style={{ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', 
                          background: batch.status === 'done' ? 'rgba(34,197,94,0.1)' : batch.status === 'sending' ? 'rgba(245,158,11,0.1)' : 'var(--color-bg-elevated)' }}>
                          {batch.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> : 
                           batch.status === 'sending' ? <Clock className="w-4 h-4 text-[#F59E0B]" /> : 
                           <MessageSquare className="w-4 h-4 text-[var(--color-text-tertiary)]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)]">{batch.name}</span>
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-medium rounded ${statusStyle(batch.status)}`}>{statusLabel(batch.status)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                            <span>{batch.total_count} contacts</span>
                            <span style={{ color:'var(--color-text-secondary)' }}>✅ {batch.sent_count} envoyés</span>
                            {batch.reply_count > 0 && <span style={{ color:'#22C55E' }}>💬 {batch.reply_count} réponses</span>}
                            {batch.city_filter && <span>📍 {batch.city_filter}</span>}
                            {batch.profession_filter && <span>🏷️ {batch.profession_filter}</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 pt-2">
        <Link href="/campaigns/new" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, fontWeight:600, borderRadius:8, background:'var(--color-accent)', color:'var(--color-bg)', textDecoration:'none' }}>
          <Plus className="w-4 h-4" /> Nouvelle campagne SMS
        </Link>
        <button onClick={async () => {
          // Quick sync ADB
          const r = await fetch('/api/sms-batches', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'sync_adb' }) });
          const d = await r.json();
          alert(`Sync ADB: ${d.updated} mises à jour\nTotal: ${d.total_sent} envoyés, ${d.total_replied} réponses`);
          loadData();
        }} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, fontWeight:500, borderRadius:8, border:'1px solid var(--color-border)', color:'var(--color-text-secondary)', background:'transparent', cursor:'pointer' }}>
          <Smartphone className="w-4 h-4" /> Sync ADB
        </button>
      </div>
    </div>
  )
}
