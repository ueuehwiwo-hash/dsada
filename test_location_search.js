/**
 * test_location_search.js
 * ──────────────────────────────────────────────────────────────
 * Test: Search Facebook for a location name → get its Page ID
 * This is needed BEFORE calling the hometown/city mutation.
 *
 * Run: node test_location_search.js "Dhaka, Bangladesh"
 * ──────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const accountFile = path.join(__dirname, 'account.txt');
const cookieStr   = fs.readFileSync(accountFile, 'utf8').split('\n')[0].trim();

const query = process.argv[2] || 'Dhaka, Bangladesh';

async function searchLocation(query) {
  console.log(`\n🔍 Searching for location: "${query}"\n`);

  try {
    // Facebook's typeahead/places search endpoint
    const res = await axios.get('https://www.facebook.com/ajax/typeahead/search/facebar/bootstrap/', {
      params: {
        value      : query,
        schema     : 'search_typeahead_locations',
        'root[0]'  : 'city',
        '__a'      : '1'
      },
      headers: {
        'Cookie'     : cookieStr,
        'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer'    : 'https://www.facebook.com/'
      },
      timeout: 10000
    });

    // FB wraps response in for(;;); prefix — strip it
    let raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    if (raw.startsWith('for (;;);')) raw = raw.slice(9);

    let data;
    try { data = JSON.parse(raw); } catch { data = res.data; }

    console.log('📦 Raw response (first 500 chars):\n', JSON.stringify(data).substring(0, 500));

    // Try to extract location results
    const payload = data?.payload;
    if (payload) {
      const results = payload.entries || payload.results || [];
      console.log(`\n📍 Found ${results.length} results:`);
      results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.uid || r.objectid || r.id}] ${r.text || r.name || JSON.stringify(r).substring(0,80)}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) console.error('   Status:', err.response.status);
  }

  // Also try the GraphQL places search
  console.log('\n──────────────────────────────────────────');
  console.log('🔍 Trying GraphQL places search...\n');

  try {
    const form = new URLSearchParams();
    form.append('q', query);
    form.append('type', 'PLACE');
    form.append('__a', '1');
    form.append('__user', cookieStr.match(/c_user=(\d+)/)?.[1] || '');

    const res2 = await axios.get(`https://www.facebook.com/search/places/?q=${encodeURIComponent(query)}`, {
      headers: {
        'Cookie'     : cookieStr,
        'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
        'Accept'     : 'text/html,application/xhtml+xml'
      },
      timeout: 10000
    });

    // Look for location IDs in the HTML
    const matches = [...res2.data.matchAll(/"id":"(\d{10,})","name":"([^"]+)"/g)];
    if (matches.length > 0) {
      console.log('📍 Locations found in page:');
      [...new Set(matches.map(m => `[${m[1]}] ${m[2]}`))].slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r}`);
      });
    } else {
      console.log('⚠️  No structured location data found in page response.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

searchLocation(query);
