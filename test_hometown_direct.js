/**
 * test_hometown_direct.js
 * ─────────────────────────────────────────────────────────────────
 * Test: /home id:112825018731802 flow
 * Uses CONFIRMED doc_id = 36114066758239170 from network capture
 *
 * Run: node test_hometown_direct.js [city_id]
 * Default city: 112825018731802 (New York)
 * ─────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const cookieStr = fs.readFileSync(path.join(__dirname, 'account.txt'), 'utf8').split('\n')[0].trim();
const botID     = cookieStr.match(/c_user=(\d+)/)?.[1] || '';
const cityId    = process.argv[2] || '112825018731802'; // New York

// ── computeJazoest (confirmed working ✅) ─────────────────────────
function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

// ── Get fb_dtsg ───────────────────────────────────────────────────
async function getFbDtsg() {
  const res = await axios.get('https://www.facebook.com/profile.php', {
    timeout: 15000,
    headers: {
      'Cookie'          : cookieStr,
      'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site'  : 'none',
      'sec-fetch-mode'  : 'navigate',
      'sec-fetch-user'  : '?1',
      'sec-fetch-dest'  : 'document',
      'sec-ch-ua'       : '"Google Chrome";v="114"',
      'sec-ch-ua-mobile': '?0',
      'accept-language' : 'en-US,en;q=0.9'
    }
  });
  let m = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) return m[1];
  m = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

// ── Save Hometown — CONFIRMED mutation ────────────────────────────
async function saveHometown(cityId, fb_dtsg) {
  const now = Date.now();

  const variables = {
    collectionToken: 'YXBwX2NvbGxlY3Rpb246cGZiaWQwTGlmZ2toNzRtUjFreXNrN0VkU2l6b1d3em9xUUQ0dUNQZlNXUnFRa1pudjRCWlB3Y1RXRVVaVjZ4djd1WmROZkd3Wko3Wllrb0Q2aVFLUWY3Y1VlOEhBNHhrWmhXbA==',
    input: {
      hometown_city_id        : cityId,           // ✅ confirmed key
      life_event_publish_type : 'SUPPRESS_ALL',   // ✅ confirmed value
      logging_data            : {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,unexpected,${now},443604,,,;ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,tap_bookmark,${now - 3000},186059,${botID},,`
      },
      privacy: {
        allow              : [],
        base_state         : 'EVERYONE',
        deny               : [],
        tag_expansion_state: 'UNSPECIFIED'
      },
      actor_id          : botID,
      client_mutation_id: '2'
    },
    scale          : 1,
    sectionToken   : 'YXBwX3NlY3Rpb246NjE1ODI2MjgyMzE3Mjg6MjMyNzE1ODIyNw==',
    useDefaultActor: false
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownProfileFieldSaveMutation');
  form.append('variables',               JSON.stringify(variables));
  form.append('server_timestamps',        'true');
  form.append('doc_id',                  '36114066758239170'); // ✅ CONFIRMED from network

  return axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
    timeout: 15000,
    headers: {
      'Content-Type'       : 'application/x-www-form-urlencoded',
      'Cookie'             : cookieStr,
      'User-Agent'         : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'Origin'             : 'https://www.facebook.com',
      'Referer'            : `https://www.facebook.com/profile.php?id=${botID}&sk=directory_personal_details`,
      'X-FB-Friendly-Name' : 'ProfileCometHometownProfileFieldSaveMutation',
      'Sec-Fetch-Site'     : 'same-origin',
      'Sec-Fetch-Mode'     : 'cors'
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(55));
  console.log('🏠 HOMETOWN DIRECT SET TEST');
  console.log('═'.repeat(55));
  console.log(`🤖 Bot ID   : ${botID}`);
  console.log(`🏙️  City ID  : ${cityId}`);
  console.log(`📋 doc_id   : 36114066758239170 (CONFIRMED ✅)`);

  // Step 1: Get fb_dtsg
  console.log('\n📡 Step 1: Fetching fb_dtsg...');
  let fb_dtsg;
  try {
    fb_dtsg = await getFbDtsg();
  } catch (e) {
    console.error('❌ GET request failed:', e.message);
    process.exit(1);
  }

  if (!fb_dtsg) {
    console.error('❌ fb_dtsg not found — cookies may be expired!');
    process.exit(1);
  }

  const jazoest = computeJazoest(fb_dtsg);
  console.log(`✅ fb_dtsg  : ${fb_dtsg.substring(0, 45)}...`);
  console.log(`🔢 jazoest  : ${jazoest}  (locally generated ✅)`);

  // Step 2: Send mutation
  console.log('\n📡 Step 2: Sending ProfileCometHometownProfileFieldSaveMutation...');
  console.log(`\n📤 Payload:`);
  console.log(`   hometown_city_id       : ${cityId}`);
  console.log(`   life_event_publish_type: SUPPRESS_ALL`);
  console.log(`   privacy.base_state     : EVERYONE`);
  console.log(`   actor_id               : ${botID}`);

  let res;
  try {
    res = await saveHometown(cityId, fb_dtsg);
  } catch (e) {
    console.error('\n❌ POST failed:', e.message);
    if (e.response) {
      console.error('   HTTP:', e.response.status);
      console.error('   Body:', JSON.stringify(e.response.data).substring(0, 300));
    }
    process.exit(1);
  }

  console.log(`\n📥 HTTP Status : ${res.status}`);
  console.log(`📥 Response    :\n${JSON.stringify(res.data, null, 2).substring(0, 500)}`);

  // Step 3: Check result
  console.log('\n' + '─'.repeat(55));
  const saved = res.data?.data?.hometown_profile_field_save;

  if (saved) {
    const hometown = saved.viewer?.actor?.hometown;
    if (hometown) {
      console.log('✅✅ SUCCESS! Hometown confirmed by Facebook:');
      console.log(`   🏠 Name : ${hometown.name}`);
      console.log(`   🆔 ID   : ${hometown.id}`);
    } else {
      console.log('✅ Mutation accepted! (hometown field not returned in response)');
    }
  } else if (res.data?.errors?.length) {
    console.log('❌ GraphQL Errors:');
    res.data.errors.forEach(e => console.log(`   • ${e.message}`));
  } else {
    console.log('⚠️  Unexpected response — check raw output above.');
  }

  console.log('═'.repeat(55));
}

main().catch(console.error);
