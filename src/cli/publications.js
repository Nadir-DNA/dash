#!/usr/bin/env node

/**
 * CLI Publications — Calendrier de publication Dash
 * 
 * Utilisation:
 *   node src/cli/publications.js add --date 2026-06-15 --title "5 signes..." --project amens --network tiktok --status scheduled
 *   node src/cli/publications.js list [--project amens] [--network tiktok] [--date 2026-06]
 *   node src/cli/publications.js status <id> [draft|scheduled|published]
 *   node src/cli/publications.js delete <id>
 *   node src/cli/publications.js today
 *   node src/cli/publications.js week
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '../../data')
const DATA_FILE = path.join(DATA_DIR, 'publications.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ posts: [] }, null, 2))
}

function loadPosts() {
  ensureDataFile()
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')).posts
  } catch {
    return []
  }
}

function savePosts(posts) {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify({ posts }, null, 2))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayKey() {
  return formatDate(new Date())
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

const VALID_PROJECTS = ['amens', 'leagueplay', 'sitevitrine', 'flashcert']
const VALID_NETWORKS = ['tiktok', 'instagram', 'twitter', 'youtube']
const VALID_STATUSES = ['draft', 'scheduled', 'published']

function parseArgs() {
  const args = process.argv.slice(2)
  const cmd = args[0]
  const parsed = { cmd, options: {}, positional: [] }

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed.options[key] = args[i + 1]
        i++
      } else {
        parsed.options[key] = true
      }
    } else {
      parsed.positional.push(args[i])
    }
  }
  return parsed
}

function cmdAdd(opts) {
  const { date, title, description, project, network, status } = opts
  if (!date) { console.error('❌ --date requis (YYYY-MM-DD)'); process.exit(1) }
  if (!title) { console.error('❌ --title requis'); process.exit(1) }
  if (project && !VALID_PROJECTS.includes(project)) { console.error(`❌ Projet invalide: ${project} (valides: ${VALID_PROJECTS.join(', ')})`); process.exit(1) }
  if (network && !VALID_NETWORKS.includes(network)) { console.error(`❌ Réseau invalide: ${network} (valides: ${VALID_NETWORKS.join(', ')})`); process.exit(1) }
  if (status && !VALID_STATUSES.includes(status)) { console.error(`❌ Statut invalide: ${status} (valides: ${VALID_STATUSES.join(', ')})`); process.exit(1) }

  const post = {
    id: generateId(),
    date,
    title: String(title),
    description: description || '',
    project: project || 'amens',
    network: network || 'tiktok',
    status: status || 'draft',
    createdAt: new Date().toISOString(),
  }

  const posts = loadPosts()
  posts.push(post)
  savePosts(posts)

  console.log(`✅ Publication créée #${post.id}`)
  console.log(`   📅 ${post.date} | ${post.project} → ${post.network}`)
  console.log(`   📝 ${post.title}`)
  console.log(`   🔵 ${post.status}`)
  return post.id
}

function cmdList(opts) {
  let posts = loadPosts()

  if (opts.project) posts = posts.filter(p => p.project === opts.project)
  if (opts.network) posts = posts.filter(p => p.network === opts.network)
  if (opts.date) {
    if (opts.date.length === 7) posts = posts.filter(p => p.date.startsWith(opts.date))
    else posts = posts.filter(p => p.date === opts.date)
  }
  if (opts.status) posts = posts.filter(p => p.status === opts.status)

  posts.sort((a, b) => a.date.localeCompare(b.date))

  if (posts.length === 0) {
    console.log('📭 Aucune publication trouvée.')
    return
  }

  console.log(`📋 ${posts.length} publication(s) :\n`)
  posts.forEach(p => {
    const statusIcon = p.status === 'draft' ? '📝' : p.status === 'scheduled' ? '📅' : '✅'
    console.log(`  ${statusIcon} #${p.id}`)
    console.log(`     📅 ${p.date}`)
    console.log(`     📝 ${p.title}`)
    console.log(`     🎯 ${p.project} → 🌐 ${p.network}`)
    console.log(`     🔵 ${p.status}`)
    console.log('')
  })
}

function cmdStatus(id, newStatus) {
  if (!id) { console.error('❌ ID requis'); process.exit(1) }
  if (!newStatus) { console.error('❌ Nouveau statut requis (draft|scheduled|published)'); process.exit(1) }
  if (!VALID_STATUSES.includes(newStatus)) { console.error(`❌ Statut invalide: ${newStatus}`); process.exit(1) }

  const posts = loadPosts()
  const idx = posts.findIndex(p => p.id === id)
  if (idx === -1) { console.error(`❌ Publication #${id} introuvable`); process.exit(1) }

  posts[idx].status = newStatus
  savePosts(posts)
  console.log(`✅ Publication #${id} → ${newStatus}`)
}

function cmdDelete(id) {
  if (!id) { console.error('❌ ID requis'); process.exit(1) }
  const posts = loadPosts()
  const idx = posts.findIndex(p => p.id === id)
  if (idx === -1) { console.error(`❌ Publication #${id} introuvable`); process.exit(1) }

  const removed = posts.splice(idx, 1)[0]
  savePosts(posts)
  console.log(`🗑️ Publication #${id} supprimée: ${removed.title}`)
}

function cmdToday() {
  const t = todayKey()
  cmdList({ date: t })
}

function cmdWeek() {
  const { start, end } = getWeekRange()
  console.log(`📅 Semaine du ${start} au ${end}\n`)
  const posts = loadPosts().filter(p => p.date >= start && p.date <= end)
  posts.sort((a, b) => a.date.localeCompare(b.date))
  if (posts.length === 0) {
    console.log('📭 Aucune publication cette semaine.')
    return
  }
  posts.forEach(p => {
    const statusIcon = p.status === 'draft' ? '📝' : p.status === 'scheduled' ? '📅' : '✅'
    console.log(`  ${statusIcon} [${p.date}] ${p.title} | ${p.project} → ${p.network} | ${p.status}`)
  })
}

function cmdHelp() {
  console.log(`
📅 CLI Publications — Calendrier de publication Dash

Utilisation:
  node src/cli/publications.js <commande> [options]

Commandes:
  add       Ajouter une publication
            --date YYYY-MM-DD (requis)
            --title "Titre"   (requis)
            --description "..." 
            --project amens|leagueplay|sitevitrine|flashcert
            --network tiktok|instagram|twitter|youtube
            --status draft|scheduled|published

  list      Lister les publications
            [--project] [--network] [--date YYYY-MM ou YYYY-MM-DD] [--status]

  status    Changer le statut d'une publication
            node src/cli/publications.js status <id> <newStatus>

  delete    Supprimer une publication
            node src/cli/publications.js delete <id>

  today     Voir les publications du jour
  week      Voir les publications de la semaine
  help      Affiche cette aide

Exemples:
  node src/cli/publications.js add --date 2026-06-15 --title "5 signes yoga" --project amens --network tiktok --status scheduled
  node src/cli/publications.js list --project amens --date 2026-06
  node src/cli/publications.js status abc123 published
  node src/cli/publications.js today
  node src/cli/publications.js week
`)
}

// ── Main dispatch ──
const { cmd, options, positional } = parseArgs()

switch (cmd) {
  case 'add':     cmdAdd(options); break
  case 'list':    cmdList(options); break
  case 'status':  cmdStatus(positional[0], positional[1]); break
  case 'delete':  cmdDelete(positional[0]); break
  case 'today':   cmdToday(); break
  case 'week':    cmdWeek(); break
  case 'help':
  case '--help':
  case '-h':
  default:        cmdHelp(); break
}
