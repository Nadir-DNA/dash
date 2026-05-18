#!/usr/bin/env node
/**
 * Génère 4 codes promo pour les testeurs Planity.ma
 * 1 mois offert sur abonnement
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Format: PLANITY-TEST-XXXX-XXXX
function generateCode() {
  const prefix = 'PLANITY'
  const part1 = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `${prefix}-${part1}-${part2}`
}

const codes = []
for (let i = 0; i < 4; i++) {
  codes.push({
    code: generateCode(),
    discount: 100, // 100% = 1 mois offert
    duration_months: 1,
    max_uses: 1,
    used_count: 0,
    active: true,
    created_at: new Date().toISOString(),
    description: `1 mois offert - Testeur Planity.ma #${i + 1}`,
  })
}

// Save to file
const outputDir = path.resolve(__dirname, '../../data')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
const outputPath = path.join(outputDir, 'codes-promo-planity.json')
fs.writeFileSync(outputPath, JSON.stringify({ codes }, null, 2))

console.log('\n🎟️  CODES PROMO PLANITY.MA — 1 MOIS OFFERT\n')
codes.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.code}  — ${c.description}`)
})
console.log(`\n📁 Sauvegardé dans: ${outputPath}\n`)
