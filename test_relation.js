/**
 * test_relation.js
 * ─────────────────────────────────────────────────────────────────
 * Standalone test: reads account.txt cookies → fetches fb_dtsg →
 * computes jazoest locally → sends GraphQL mutation to set SINGLE.
 *
 * Run: node test_relation.js
 * ─────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ── 1. Load cookie string from account.txt ────────────────────────
const accountFile = path.join(__dirname, 'account.txt');
const cookieStr   = fs.readFileSync(accountFile, 'utf8').split('\n')[0].trim();

if (!cookieStr) {
  console.error('❌ account.txt is empty or missing!');
  process.exit(1);
}

// ── 2. Extract c_user (botID) from cookie string ─────────────────
const cUserMatch = cookieStr.match(/c_user=(\d+)/);
if (!cUserMatch) {
  console.error('❌ Could not find c_user in cookie string!');
  process.exit(1);
}
const botID = cUserMatch[1];
console.log(`\n🤖 Bot ID   : ${botID}`);
console.log(`🍪 Cookies  : ${cookieStr.substring(0, 60)}...`);

// ── 3. computeJazoest — same algorithm Facebook uses client-side ─
function computeJazoest(fb_dtsg) {
  let sum = 0;
  for (let i = 0; i < fb_dtsg.length; i++) {
    sum += fb_dtsg.charCodeAt(i);
  }
  return '2' + sum;
}

// ── 4. Main test function ─────────────────────────────────────────
async function testRelationSingle() {
  let fb_dtsg = '';
  let jazoest = '';

  // Step A: Fetch fb_dtsg from Facebook
  console.log('\n📡 Step 1: Fetching fb_dtsg from Facebook...');
  try {
    const res = await axios.get('https://www.facebook.com/profile.php', {
      headers: {
        'Cookie'          : cookieStr,
        'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-fetch-site'  : 'none',
        'sec-fetch-mode'  : 'navigate',
        'sec-fetch-user'  : '?1',
        'sec-fetch-dest'  : 'document'
      },
      timeout: 15000
    });

    // Try pattern 1
    const m1 = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
    if (m1) fb_dtsg = m1[1];

    // Try pattern 2 (fallback)
    if (!fb_dtsg) {
      const m2 = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
      if (m2) fb_dtsg = m2[1];
    }

    if (!fb_dtsg) {
      console.error('❌ fb_dtsg not found in page! Session may be expired.');
      process.exit(1);
    }

    console.log(`✅ fb_dtsg  : ${fb_dtsg}`);

  } catch (err) {
    console.error('❌ GET request failed:', err.message);
    process.exit(1);
  }

  // Step B: Compute jazoest locally
  jazoest = computeJazoest(fb_dtsg);
  console.log(`🔢 jazoest  : ${jazoest}  (computed locally — no extra request)`);

  // Step C: Build GraphQL mutation payload
  console.log('\n📡 Step 2: Sending GraphQL mutation (SINGLE)...');

  const sectionToken    = 'YXBwX3NlY3Rpb246NjE1ODI2MjgyMzE3Mjg6MjMyNzE1ODIyNw==';
  const collectionToken = 'YXBwX2NvbGxlY3Rpb246cGZiaWQwTGlmZ2toNzRtUjFreXNrN0VkU2l6b1d3em9xUUQ0dUNQZlNXUnFRa1pudjRCWlB3Y1RXRVVaVjZ4djd1WmROZkd3Wko3Wllrb0Q2aVFLUWY3Y1VlOEhBNHhrWmhXbA==';

  const variables = {
    collectionToken,
    input: {
      life_event_publish_type : null,
      privacy: {
        allow               : [],
        base_state          : 'EVERYONE',
        deny                : [],
        tag_expansion_state : 'UNSPECIFIED'
      },
      status_const   : 'SINGLE',
      subtitle       : null,
      logging_data   : {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,unexpected,${Date.now()},695371,,,;ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,tap_bookmark,${Date.now() - 3000},616598,${botID},,`
      },
      actor_id          : botID,
      client_mutation_id: '2'
    },
    scale          : 1,
    sectionToken,
    useDefaultActor: false
  };

  const formData = new URLSearchParams();
  formData.append('fb_dtsg',               fb_dtsg);
  formData.append('jazoest',               jazoest);
  formData.append('fb_api_caller_class',   'RelayModern');
  formData.append('fb_api_req_friendly_name', 'ProfileCometUserUpdateRelationshipStatusMutation');
  formData.append('variables',             JSON.stringify(variables));
  formData.append('doc_id',               '27314313718254937');

  console.log('\n📤 Request Payload:');
  console.log('   fb_dtsg  :', fb_dtsg);
  console.log('   jazoest  :', jazoest);
  console.log('   actor_id :', botID);
  console.log('   status   : SINGLE');

  // Step D: Send POST request
  try {
    const mutationRes = await axios.post(
      'https://www.facebook.com/api/graphql/',
      formData.toString(),
      {
        headers: {
          'Content-Type'       : 'application/x-www-form-urlencoded',
          'Cookie'             : cookieStr,
          'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Origin'             : 'https://www.facebook.com',
          'Referer'            : `https://www.facebook.com/profile.php?id=${botID}`,
          'X-FB-Friendly-Name' : 'ProfileCometUserUpdateRelationshipStatusMutation',
          'Sec-Fetch-Site'     : 'same-origin',
          'Sec-Fetch-Mode'     : 'cors'
        },
        timeout: 15000
      }
    );

    console.log('\n📥 Response Status  :', mutationRes.status);
    console.log('📥 Response Preview :', JSON.stringify(mutationRes.data).substring(0, 300));

    // Check result
    if (
      mutationRes.data &&
      mutationRes.data.data &&
      mutationRes.data.data.user_update_relationship_status
    ) {
      console.log('\n✅✅ SUCCESS! Relationship status set to SINGLE!');
    } else if (mutationRes.data?.errors) {
      console.log('\n❌ GraphQL Errors:', JSON.stringify(mutationRes.data.errors, null, 2));
    } else {
      console.log('\n⚠️  Unknown response — check raw output above.');
    }

  } catch (err) {
    console.error('\n❌ POST request failed:', err.message);
    if (err.response) {
      console.error('   HTTP Status :', err.response.status);
      console.error('   Response    :', JSON.stringify(err.response.data).substring(0, 200));
    }
  }
}

testRelationSingle();
