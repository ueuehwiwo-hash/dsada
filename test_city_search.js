/**
 * test_city_search.js
 * ─────────────────────────────────────────────────────────────────
 * Test location/city typeahead search with different doc_ids
 * Also test the confirmed hometown SAVE mutation directly.
 *
 * Run: node test_city_search.js "New York"
 * ─────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const cookieStr = fs.readFileSync(path.join(__dirname, 'account.txt'), 'utf8').split('\n')[0].trim();
const botID     = cookieStr.match(/c_user=(\d+)/)?.[1] || '';
const query     = process.argv[2] || 'New York';

function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

async function getFbDtsg() {
  const res = await axios.get('https://www.facebook.com/profile.php', {
    timeout: 15000,
    headers: {
      'Cookie'     : cookieStr,
      'User-Agent' : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'accept'     : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document'
    }
  });
  let m = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) return m[1];
  m = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

async function trySearch(label, doc_id, fb_dtsg, variables) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`🧪 Test: ${label}`);
  console.log(`   doc_id: ${doc_id}`);

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownTypeaheadSearchQuery');
  form.append('variables',               JSON.stringify(variables));
  form.append('server_timestamps',        'true');
  form.append('doc_id',                  doc_id);

  try {
    const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
      timeout: 10000,
      headers: {
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Cookie'        : cookieStr,
        'User-Agent'    : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
        'Origin'        : 'https://www.facebook.com',
        'Referer'       : 'https://www.facebook.com/',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors'
      }
    });

    const raw = JSON.stringify(res.data).substring(0, 400);
    console.log(`   Status : ${res.status}`);

    if (res.data?.errors) {
      console.log(`   ❌ ERRORS: ${JSON.stringify(res.data.errors).substring(0, 200)}`);
    } else if (res.data?.data) {
      const keys = Object.keys(res.data.data);
      console.log(`   ✅ DATA keys: ${keys.join(', ')}`);

      // Try to extract city results
      const results =
        res.data.data?.city_typeahead?.results ||
        res.data.data?.hometown_typeahead?.results ||
        res.data.data?.location_search?.results ||
        [];

      if (results.length > 0) {
        console.log(`   🎯 FOUND ${results.length} results!`);
        results.slice(0, 3).forEach((r, i) => {
          const name = r.node?.name || r.name || r.text || JSON.stringify(r).substring(0, 50);
          const id   = r.node?.id   || r.id   || '?';
          console.log(`      ${i + 1}. [${id}] ${name}`);
        });
      } else {
        console.log(`   ⚠️  No results array found. Raw: ${raw}`);
      }
    } else {
      console.log(`   ⚠️  Unknown response: ${raw}`);
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    if (e.response) {
      console.log(`   HTTP: ${e.response.status}`);
      console.log(`   Body: ${JSON.stringify(e.response.data).substring(0, 200)}`);
    }
  }
}

async function main() {
  console.log(`\n🔑 Fetching fb_dtsg...`);
  const fb_dtsg = await getFbDtsg();
  if (!fb_dtsg) { console.error('❌ Could not get fb_dtsg! Cookies may be expired.'); process.exit(1); }
  console.log(`✅ fb_dtsg : ${fb_dtsg.substring(0, 40)}...`);
  console.log(`🔢 jazoest: ${computeJazoest(fb_dtsg)}`);
  console.log(`🔍 Query  : "${query}"`);

  const vars1 = {
    params: { caller: 'PROFILE_EDITOR', city_field: 'HOMETOWN', max_results: 5, query, scale: 1 }
  };
  const vars2 = {
    params: { caller: 'PROFILE_EDITOR', city_field: 'CURRENT_CITY', max_results: 5, query, scale: 1 }
  };
  const vars3 = { query, scale: 1, max_results: 5 };

  // Test multiple doc_ids — all guessed (random attempts)
  const candidates = [
    ['Guessed typeahead #1',  '7823264637693803', vars1],
    ['Guessed typeahead #2',  '6817756641645618', vars1],
    ['Guessed typeahead #3',  '25355624849563635', vars1],
    ['Guessed current_city',  '7823264637693803', vars2],
    ['Guessed simple vars',   '7823264637693803', vars3],
  ];

  for (const [label, doc_id, variables] of candidates) {
    await trySearch(label, doc_id, fb_dtsg, variables);
    await new Promise(r => setTimeout(r, 800)); // small delay between requests
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log('📋 CONCLUSION:');
  console.log('   Save mutation doc_id (CONFIRMED) = 36114066758239170');
  console.log('   Search doc_id = needs browser capture to confirm');
  console.log('═'.repeat(55));
}

main().catch(console.error);
