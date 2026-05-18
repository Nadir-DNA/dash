#!/usr/bin/env node
/**
 * Amens - Real Google Maps Scraper with Puppeteer
 * Actually scrapes Google Maps (not simulated)
 * 
 * Usage: node google-maps-scraper-real.js "Paris" "coach sportif"
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeGoogleMaps(city, query) {
    console.log(`🗺️  Scraping: ${query} in ${city}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Google Maps
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}+${encodeURIComponent(city)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load
    await page.waitForSelector('[role="feed"]', { timeout: 10000 }).catch(() => {
        console.log('   ⚠️  No results found or blocked by Google');
    });
    
    // Extract business information
    const leads = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('[role="article"]');
        
        items.forEach(item => {
            try {
                const name = item.querySelector('div[role="heading"]')?.textContent || '';
                const rating = item.querySelector('.star-rating')?.textContent || '';
                const reviews = item.querySelector('span[aria-label*="reviews"]')?.textContent || '';
                const address = item.querySelectorAll('.rRttmd')?.[1]?.textContent || '';
                const type = item.querySelectorAll('.rRttmd')?.[0]?.textContent || '';
                
                if (name) {
                    results.push({
                        name,
                        rating,
                        reviews,
                        address,
                        type,
                        google_maps_url: window.location.href
                    });
                }
            } catch (e) {
                // Skip malformed entries
            }
        });
        
        return results;
    });
    
    await browser.close();
    
    console.log(`   ✅ Found ${leads.length} businesses`);
    return leads;
}

function saveToCSV(leads, city, query) {
    const filename = `google-maps-${city.replace(/\s+/g, '-')}-${query.replace(/\s+/g, '-')}.csv`;
    const filepath = path.join(__dirname, '..', 'scraped-leads', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // CSV header
    let csv = 'Name,Rating,Reviews,Address,Type,Google Maps URL\n';
    
    // CSV rows
    leads.forEach(lead => {
        csv += `"${lead.name}","${lead.rating}","${lead.reviews}","${lead.address}","${lead.type}","${lead.google_maps_url}"\n`;
    });
    
    fs.writeFileSync(filepath, csv);
    console.log(`   📄 Saved: ${filepath}`);
    
    return filepath;
}

async function main() {
    console.log('='.repeat(60));
    console.log('🗺️  AMENS - REAL GOOGLE MAPS SCRAPER');
    console.log('='.repeat(60));
    
    const cities = process.argv[2] ? [process.argv[2]] : ['Paris', 'Lyon', 'Bordeaux'];
    const query = process.argv[3] || 'coach sportif';
    
    const allLeads = [];
    
    for (const city of cities) {
        try {
            const leads = await scrapeGoogleMaps(city, query);
            allLeads.push(...leads);
            
            // Save to CSV
            if (leads.length > 0) {
                saveToCSV(leads, city, query);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.log(`   ❌ Error scraping ${city}: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Total leads: ${allLeads.length}`);
    console.log('='.repeat(60));
    
    // Save all leads to JSON
    const jsonPath = path.join(__dirname, '..', 'scraped-leads', 'all-leads.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allLeads, null, 2));
    console.log(`\n💾 All leads: ${jsonPath}`);
}

main().catch(console.error);
