/**
 * test_location_search2.js
 * ─────────────────────────────────────────────────────────────
 * Find location Page ID using Facebook's internal search GraphQL
 * Run: node test_location_search2.js "Dhaka"
 * ─────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const accountFile = path.join(__dirname, 'account.txt');
const cookieStr   = fs.readFileSync(accountFile, 'utf8').split('\n')[0].trim();
const botID       = cookieStr.match(/c_user=(\d+)/)?.[1] || '';

const query = process.argv[2] || 'Dhaka';

// Compute jazoest (same confirmed-working algo)
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
      'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
      'accept'     : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  let m = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) return m[1];
  m = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

async function searchPlaces(query, fb_dtsg) {
  const variables = {
    params: {
      caller       : 'PROFILE_EDITOR',
      city_field   : 'CURRENT_CITY',
      max_results  : 5,
      query,
      scale        : 1
    }
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometCurrentCityTypeaheadSearchQuery');
  form.append('variables',               JSON.stringify(variables));
  form.append('doc_id',                  '7823264637693803'); // typeahead search doc_id

  const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
    timeout: 15000,
    headers: {
      'Content-Type'       : 'application/x-www-form-urlencoded',
      'Cookie'             : cookieStr,
      'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
      'Origin'             : 'https://www.facebook.com',
      'Referer'            : 'https://www.facebook.com/',
      'X-FB-Friendly-Name': 'ProfileCometCurrentCityTypeaheadSearchQuery',
      'Sec-Fetch-Site'     : 'same-origin',
      'Sec-Fetch-Mode'     : 'cors'
    }
  });

  return res.data;
}

async function main() {
  console.log(`\n🔑 Fetching fb_dtsg...`);
  const fb_dtsg = await getFbDtsg();
  if (!fb_dtsg) { console.error('❌ Could not get fb_dtsg'); return; }
  console.log(`✅ fb_dtsg: ${fb_dtsg.substring(0, 30)}...`);
  console.log(`🔢 jazoest: ${computeJazoest(fb_dtsg)}`);

  console.log(`\n🔍 Searching for: "${query}"\n`);

  try {
    const data = await searchPlaces(query, fb_dtsg);
    console.log('📦 Response:\n', JSON.stringify(data, null, 2).substring(0, 1000));
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Body  :', JSON.stringify(err.response.data).substring(0, 300));
    }
  }
}

main();
