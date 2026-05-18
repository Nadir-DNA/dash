'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, Smartphone, RefreshCw, MessageCircle, Filter } from 'lucide-react'

interface Contact {
  id: string
  lead_id: string | null
  first_name: string
  phone: string
  profession: string
  city: string
  status: 'pending' | 'sent' | 'replied'
  sent_at: string | null
  replied_at: string | null
  created_at: string
}

interface Batch {
  id: string
  campaign_id: string
  name: string
  status: string
  total_count: number
  sent_count: number
  reply_count: number
  city_filter: string | null
  profession_filter: string | null
  created_at: string
}

function fmtDate(d: string | null) {
  if(!d) return '—'
  try{return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return d}
}

function StatusIcon({ status }: { status: string }) {
  switch(status) {
    case 'replied':  return <MessageCircle className="w-3.5 h-3.5 text-[#22C55E]" />
    case 'sent':     return <CheckCircle2 className="w-3.5 h-3.5 text-[#818cf8]" />
    default:         return <Clock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
  }
}
function StatusLabel({ status }: { status: string }) {
  switch(status) {
    case 'replied':  return <span style={{ color:'#22C55E', fontWeight:600 }}>💬 GO</span>
    case 'sent':     return <span style={{ color:'#818cf8', fontWeight:500 }}>✅ Envoyé</span>
    default:         return <span style={{ color:'var(--color-text-tertiary)' }}>⏳ En attente</span>
  }
}

export default function BatchDetailPage() {
  const params = useParams()
  const batchId = params.id as string

  const [batch, setBatch] = useState<Batch | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/sms-batches?batch_id=${batchId}`)
      const d = await r.json()
      setBatch(d.batch)
      setContacts(d.contacts || [])
    } catch(e) {
      console.error('Load batch error:', e)
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => { loadData() }, [loadData])

  // Mark individual contact as sent
  const markSent = async (contactId: string) => {
    const r = await fetch('/api/sms-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_adb' }),
    })
    await r.json()
    loadData()
  }

  const filteredContacts = filterStatus === 'all' 
    ? contacts 
    : contacts.filter(c => c.status === filterStatus)

  const stats = {
    total: contacts.length,
    sent: contacts.filter(c => c.status === 'sent').length,
    replied: contacts.filter(c => c.status === 'replied').length,
    pending: contacts.filter(c => c.status === 'pending').length,
  }

  if(loading && !batch) return (
    <div className="flex items-center justify-center h-96 animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] rounded-full border-t-transparent" />
        <span className="text-sm text-[var(--color-text-tertiary)]">Chargement...</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/sms-campaigns" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)', color:'var(--color-text-secondary)', textDecoration:'none' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--color-text-tertiary)' }}>
            {batch?.name || 'Batch'}
          </h2>
          <p style={{ fontSize:12, color:'var(--color-text-tertiary)', marginTop:4 }}>
            {batch?.city_filter && `📍 ${batch.city_filter}`}{batch?.city_filter && batch?.profession_filter && ' · '}{batch?.profession_filter && `🏷️ ${batch.profession_filter}`}
            {batch && ` · Créé ${fmtDate(batch.created_at)}`}
          </p>
        </div>
        <button onClick={loadData} style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:11, fontWeight:500, borderRadius:8, border:'1px solid var(--color-border)', color:'var(--color-text-secondary)', background:'transparent', cursor:'pointer' }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {batch && (
        <div style={{ background:'var(--color-bg-card)', border:'1px solid var(--color-border)', borderRadius:12, padding:20 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-display)', tabularNums:'true', color:'var(--color-text)' }}>{stats.sent + stats.replied}</div>
                <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginTop:2 }}>Traités</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-display)', tabularNums:'true', color:'#22C55E' }}>{stats.replied}</div>
                <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginTop:2 }}>Réponses GO</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-display)', tabularNums:'true', color:'var(--color-text-tertiary)' }}>{stats.pending}</div>
                <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginTop:2 }}>En attente</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-display)', tabularNums:'true', color:'var(--color-text)' }}>{stats.total}</div>
              <div style={{ fontSize:10, color:'var(--color-text-tertiary)', marginTop:2 }}>Total</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height:6, background:'var(--color-border)', borderRadius:3, overflow:'hidden', display:'flex' }}>
            <div style={{ height:'100%', background:'#818cf8', transition:'width 0.5s', width:`${stats.total > 0 ? (stats.sent/stats.total)*100 : 0}%` }} />
            <div style={{ height:'100%', background:'#22C55E', transition:'width 0.5s', width:`${stats.total > 0 ? (stats.replied/stats.total)*100 : 0}%` }} />
          </div>
          <div style={{ display:'flex', gap:12, marginTop:6, fontSize:10, color:'var(--color-text-tertiary)' }}>
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:'50%', background:'#818cf8', display:'inline-block' }} /> Envoyés ({stats.sent})</span>
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', display:'inline-block' }} /> Réponses ({stats.replied})</span>
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:'50%', background:'var(--color-border)', display:'inline-block' }} /> En attente ({stats.pending})</span>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button onClick={async () => {
              const r = await fetch('/api/sms-batches', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'sync_adb' }) });
              const d = await r.json();
              loadData();
            }} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, fontWeight:500, borderRadius:8, border:'1px solid var(--color-border)', color:'var(--color-text-secondary)', background:'transparent', cursor:'pointer' }}>
              <Smartphone className="w-3.5 h-3.5" /> Sync ADB (vérifier réponses)
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, padding:4, borderRadius:8, background:'var(--color-bg-card)', border:'1px solid var(--color-border)', width:'fit-content' }}>
        {([
          { id:'all', label:'Tous', count:stats.total },
          { id:'pending', label:'⏳ En attente', count:stats.pending },
          { id:'sent', label:'✅ Envoyés', count:stats.sent },
          { id:'replied', label:'💬 Réponses', count:stats.replied },
        ] as const).map(({ id, label, count }) => (
          <button key={id} onClick={() => setFilterStatus(id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:11, fontWeight:500, borderRadius:6, cursor:'pointer', border:'none',
              background: filterStatus===id ? 'var(--color-accent)' : 'transparent',
              color: filterStatus===id ? 'var(--color-bg)' : 'var(--color-text-secondary)',
            }}>
            {label}
            <span style={{ fontSize:10, opacity:0.7 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Contacts list */}
      <div className="chart-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Statut</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Nom</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Téléphone</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Métier</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Ville</th>
                <th className="text-right py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Envoyé</th>
                <th className="text-right py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Répondu</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map(c => (
                <tr key={c.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={c.status} />
                      <StatusLabel status={c.status} />
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-medium text-[var(--color-text)]">{c.first_name || '—'}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[var(--color-text-secondary)]">
                    {c.phone}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--color-text-secondary)]">
                    {c.profession || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--color-text-secondary)]">
                    {c.city || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-xs text-[var(--color-text-tertiary)]">
                    {c.sent_at ? fmtDate(c.sent_at) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {c.replied_at ? (
                      <span style={{ color:'#22C55E', fontSize:11, fontWeight:500 }}>{fmtDate(c.replied_at)}</span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)] text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
                    {filterStatus === 'all' ? 'Aucun contact dans ce batch' : `Aucun contact avec le statut "${filterStatus}"`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      {contacts.length > 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:8, background:'var(--color-bg-card)', border:'1px solid var(--color-border)' }}>
          <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>
            {filteredContacts.length} / {contacts.length} contacts affichés
          </span>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)]">
            <span>⏳ {stats.pending}</span>
            <span>✅ {stats.sent}</span>
            <span style={{ color:'#22C55E' }}>💬 {stats.replied}</span>
          </div>
        </div>
      )}
    </div>
  )
}
