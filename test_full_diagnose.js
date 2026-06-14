/**
 * test_full_diagnose.js
 * ─────────────────────────────────────────────────────────────
 * Full diagnostic:
 *  1. Cookie alive check
 *  2. fb_dtsg extract
 *  3. Hometown save (confirmed doc_id)
 *  4. Location search (guessed doc_ids)
 *  5. Random fb_dtsg test (expected: fail)
 * ─────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const cookieStr = fs.readFileSync(path.join(__dirname, 'account.txt'), 'utf8').split('\n')[0].trim();
const botID     = cookieStr.match(/c_user=(\d+)/)?.[1] || '';

function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

function randomDtsg() {
  // Random string similar to fb_dtsg format
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let s = '';
  for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s}:19:${Date.now()}`;
}

function log(emoji, label, value) {
  console.log(`${emoji} ${label.padEnd(18)}: ${value}`);
}

// ═══════════════════════════════════════════════════════════
async function step1_cookieCheck() {
  console.log('\n' + '═'.repeat(55));
  console.log('📋 STEP 1: Cookie Alive Check');
  console.log('═'.repeat(55));

  log('🍪', 'botID',      botID || '❌ NOT FOUND in cookie');
  log('📏', 'Cookie len', cookieStr.length + ' chars');

  const hasCUser = /c_user=\d+/.test(cookieStr);
  const hasXs    = /xs=/.test(cookieStr);
  const hasDatr  = /datr=/.test(cookieStr);
  log('✅', 'c_user',  hasCUser ? 'PRESENT' : '❌ MISSING');
  log('✅', 'xs',      hasXs    ? 'PRESENT' : '❌ MISSING');
  log('✅', 'datr',    hasDatr  ? 'PRESENT' : '❌ MISSING');

  if (!hasCUser || !hasXs) {
    console.log('\n❌ Cookie appears INVALID or incomplete!');
    return false;
  }

  // Try a simple authenticated request
  try {
    const res = await axios.get(`https://www.facebook.com/profile.php?id=${botID}`, {
      timeout: 15000,
      maxRedirects: 3,
      headers: {
        'Cookie'          : cookieStr,
        'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'sec-fetch-site'  : 'none',
        'sec-fetch-mode'  : 'navigate',
        'sec-fetch-dest'  : 'document',
        'sec-ch-ua'       : '"Google Chrome";v="114"',
        'sec-ch-ua-mobile': '?0',
        'accept-language' : 'en-US,en;q=0.9'
      }
    });

    const html = res.data;
    const isLoggedOut = /id="loginform"|login_form|You must log in/i.test(html);
    const hasProfile  = new RegExp(botID).test(html);

    if (isLoggedOut) {
      console.log('\n❌ RESULT: Cookies EXPIRED — Facebook shows login page!');
      return false;
    }

    log('🌐', 'HTTP Status', res.status);
    log('📄', 'Page length', html.length + ' chars');
    log('👤', 'Profile ID',  hasProfile ? `✅ ${botID} found in page` : '⚠️  Not found');
    console.log('\n✅ RESULT: Cookies appear VALID!');
    return html;
  } catch (e) {
    console.log('\n❌ Request failed:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
async function step2_extractDtsg(html) {
  console.log('\n' + '═'.repeat(55));
  console.log('📋 STEP 2: Extract fb_dtsg');
  console.log('═'.repeat(55));

  if (!html) {
    // Try multiple pages to find one with fb_dtsg
    const urls = [
      'https://www.facebook.com/profile.php',
      `https://www.facebook.com/profile.php?id=${botID}&sk=about_overview`,
      `https://www.facebook.com/profile.php?id=${botID}&sk=directory_personal_details`,
      'https://www.facebook.com/settings/',
      'https://www.facebook.com/'
    ];
    for (const url of urls) {
      try {
        console.log(`   Trying: ${url}`);
        const res = await axios.get(url, {
          timeout: 15000,
          headers: {
            'Cookie'         : cookieStr,
            'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'sec-fetch-site' : 'none', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document',
            'sec-ch-ua'      : '"Google Chrome";v="114"',
            'sec-ch-ua-mobile': '?0',
            'accept-language': 'en-US,en;q=0.9'
          }
        });
        const hasDtsg = res.data.includes('fb_dtsg') || res.data.includes('DTSGInitialData');
        console.log(`   → ${res.status} | fb_dtsg in page: ${hasDtsg ? '✅ YES' : '❌ NO'} | len: ${res.data.length}`);
        if (hasDtsg) { html = res.data; break; }
      } catch (e) {
        console.log(`   → ❌ ${e.message}`);
      }
    }
    if (!html) { console.log('❌ Cannot fetch page with fb_dtsg from any URL'); return null; }
  }

  // Pattern 1
  let m = html.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) {
    const dtsg = m[1];
    log('✅', 'Pattern 1',  'FOUND');
    log('🔑', 'fb_dtsg',    dtsg.substring(0, 45) + '...');
    log('🔢', 'jazoest',    computeJazoest(dtsg));
    return dtsg;
  }

  // Pattern 2
  m = html.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  if (m) {
    const dtsg = m[1];
    log('✅', 'Pattern 2', 'FOUND');
    log('🔑', 'fb_dtsg',   dtsg.substring(0, 45) + '...');
    log('🔢', 'jazoest',   computeJazoest(dtsg));
    return dtsg;
  }

  // Pattern 3
  m = html.match(/"DTSGInitialData".*?"token":"([^"]+)"/);
  if (m) {
    const dtsg = m[1];
    log('✅', 'Pattern 3', 'FOUND');
    log('🔑', 'fb_dtsg',   dtsg.substring(0, 45) + '...');
    return dtsg;
  }

  console.log('❌ fb_dtsg NOT FOUND in page HTML!');
  console.log('   (Page may show login form — cookies expired)');

  // Show what we see
  const snippet = html.substring(0, 300).replace(/\s+/g, ' ');
  console.log(`\n   HTML Preview: ${snippet}`);
  return null;
}

// ═══════════════════════════════════════════════════════════
async function step3_hometownSave(fb_dtsg, cityId = '112825018731802') {
  console.log('\n' + '═'.repeat(55));
  console.log('📋 STEP 3: Hometown Save (CONFIRMED doc_id)');
  console.log('═'.repeat(55));
  log('🏙️', 'City ID', cityId + ' (New York)');
  log('📋', 'doc_id',  '36114066758239170 ✅ confirmed');

  const now = Date.now();
  const variables = {
    collectionToken: 'YXBwX2NvbGxlY3Rpb246cGZiaWQwTGlmZ2toNzRtUjFreXNrN0VkU2l6b1d3em9xUUQ0dUNQZlNXUnFRa1pudjRCWlB3Y1RXRVVaVjZ4djd1WmROZkd3Wko3Wllrb0Q2aVFLUWY3Y1VlOEhBNHhrWmhXbA==',
    input: {
      hometown_city_id        : cityId,
      life_event_publish_type : 'SUPPRESS_ALL',
      logging_data            : {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,unexpected,${now},443604,,,;ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,tap_bookmark,${now-3000},186059,${botID},,`
      },
      privacy: { allow: [], base_state: 'EVERYONE', deny: [], tag_expansion_state: 'UNSPECIFIED' },
      actor_id: botID, client_mutation_id: '2'
    },
    scale: 1,
    sectionToken: 'YXBwX3NlY3Rpb246NjE1ODI2MjgyMzE3Mjg6MjMyNzE1ODIyNw==',
    useDefaultActor: false
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownProfileFieldSaveMutation');
  form.append('variables',               JSON.stringify(variables));
  form.append('server_timestamps',        'true');
  form.append('doc_id',                  '36114066758239170');

  try {
    const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
      timeout: 15000,
      headers: {
        'Content-Type'       : 'application/x-www-form-urlencoded',
        'Cookie'             : cookieStr,
        'User-Agent'         : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36',
        'Origin'             : 'https://www.facebook.com',
        'Referer'            : `https://www.facebook.com/profile.php?id=${botID}&sk=directory_personal_details`,
        'X-FB-Friendly-Name' : 'ProfileCometHometownProfileFieldSaveMutation',
        'Sec-Fetch-Site'     : 'same-origin', 'Sec-Fetch-Mode': 'cors'
      }
    });
    log('🌐', 'HTTP Status', res.status);
    const saved = res.data?.data?.hometown_profile_field_save;
    if (saved) {
      const name = saved.viewer?.actor?.hometown?.name || 'confirmed';
      console.log(`\n✅✅ SUCCESS! Hometown = "${name}"`);
    } else if (res.data?.errors) {
      console.log('\n❌ GraphQL Error:', JSON.stringify(res.data.errors).substring(0, 200));
    } else {
      console.log('\n⚠️  Response:', JSON.stringify(res.data).substring(0, 300));
    }
  } catch (e) {
    console.log('❌ POST Error:', e.message, e.response?.status || '');
  }
}

// ═══════════════════════════════════════════════════════════
async function step4_searchTest(fb_dtsg) {
  console.log('\n' + '═'.repeat(55));
  console.log('📋 STEP 4: Location Search (guessed doc_ids)');
  console.log('═'.repeat(55));

  const docIds = [
    '7823264637693803',
    '6817756641645618',
    '25355624849563635',
    '8023718634371803',
  ];

  const vars = { params: { caller: 'PROFILE_EDITOR', city_field: 'HOMETOWN', max_results: 5, query: 'Dhaka', scale: 1 } };

  for (const doc_id of docIds) {
    const form = new URLSearchParams();
    form.append('fb_dtsg',  fb_dtsg);
    form.append('jazoest',  computeJazoest(fb_dtsg));
    form.append('fb_api_caller_class',      'RelayModern');
    form.append('fb_api_req_friendly_name', 'ProfileCometHometownTypeaheadSearchQuery');
    form.append('variables', JSON.stringify(vars));
    form.append('doc_id',   doc_id);

    try {
      const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
        timeout: 8000,
        headers: {
          'Content-Type'  : 'application/x-www-form-urlencoded',
          'Cookie'        : cookieStr,
          'User-Agent'    : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36',
          'Origin'        : 'https://www.facebook.com',
          'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors'
        }
      });
      const hasData   = !!res.data?.data;
      const hasErrors = !!res.data?.errors;
      const keys      = hasData ? Object.keys(res.data.data).join(', ') : '';
      const errMsg    = hasErrors ? res.data.errors[0]?.message?.substring(0, 60) : '';
      console.log(`  doc_id ${doc_id}: HTTP=${res.status} ${hasData ? `✅ keys=[${keys}]` : ''} ${hasErrors ? `❌ err=${errMsg}` : ''}`);
    } catch (e) {
      console.log(`  doc_id ${doc_id}: ❌ ${e.message.substring(0, 50)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

// ═══════════════════════════════════════════════════════════
async function step5_randomDtsgTest() {
  console.log('\n' + '═'.repeat(55));
  console.log('📋 STEP 5: Random fb_dtsg Test (expected FAIL)');
  console.log('═'.repeat(55));

  const fakeDtsg = randomDtsg();
  log('🎲', 'Random dtsg', fakeDtsg.substring(0, 45) + '...');
  log('🔢', 'jazoest',     computeJazoest(fakeDtsg));

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fakeDtsg);
  form.append('jazoest',                  computeJazoest(fakeDtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownProfileFieldSaveMutation');
  form.append('variables',               JSON.stringify({ input: { hometown_city_id: '112825018731802', actor_id: botID, client_mutation_id: '1' }, scale: 1, useDefaultActor: false }));
  form.append('doc_id',                  '36114066758239170');

  try {
    const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
      timeout: 10000,
      headers: {
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Cookie'        : cookieStr,
        'User-Agent'    : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36',
        'Origin'        : 'https://www.facebook.com',
        'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors'
      }
    });
    log('🌐', 'HTTP Status', res.status);
    if (res.data?.errors) console.log('❌ Rejected:', res.data.errors[0]?.message);
    else console.log('Response:', JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    log('❌', 'Result', `HTTP ${e.response?.status || ''} — ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('🔬 FULL DIAGNOSTIC TEST');
  console.log(`📅 Time: ${new Date().toISOString()}`);

  const html    = await step1_cookieCheck();
  const fb_dtsg = await step2_extractDtsg(html || null);

  if (!fb_dtsg) {
    console.log('\n\n🛑 DIAGNOSIS: fb_dtsg extract FAILED');
    console.log('   → Cookies are EXPIRED or invalid');
    console.log('   → Update account.txt with fresh browser cookies');
    return;
  }

  await step3_hometownSave(fb_dtsg);
  await step4_searchTest(fb_dtsg);
  await step5_randomDtsgTest();

  console.log('\n' + '═'.repeat(55));
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('═'.repeat(55));
}

main().catch(console.error);
