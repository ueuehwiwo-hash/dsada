const axios = require('axios');

// ─────────────────────────────────────────────────────────────────
// Per-account fb_dtsg cache
// Key: botID → { dtsg, fetchedAt, cookieFingerprint }
// jazoest is NEVER stored — always computed fresh from dtsg
// ─────────────────────────────────────────────────────────────────
const _dtsgCache   = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Facebook's client-side jazoest algorithm (TESTED & CONFIRMED ✅)
// jazoest = "2" + sum_of_charCodes(fb_dtsg)
function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

// Fetch fb_dtsg from Facebook page (last resort — result is cached)
async function fetchDtsg(cookieStr) {
  // ⚠️  MUST use desktop UA — mobile UA returns stripped page WITHOUT fb_dtsg
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

  // Pattern 1: standard input field
  let m = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) return m[1];

  // Pattern 2: DTSGInitialData JSON blob (desktop Comet page)
  m = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

// ─────────────────────────────────────────────────────────────────
// Resolve fb_dtsg with 3-tier priority:
//   1. appState cookies (instant, no HTTP)
//   2. Per-account TTL cache (instant, no HTTP)
//   3. HTTP GET to Facebook (only when needed, then cached)
// ─────────────────────────────────────────────────────────────────
async function getDtsg(appState, botID, cookieStr) {
  // Fingerprint = xs cookie (unique per session/account)
  const xs          = appState.find(c => c.key === 'xs');
  const fingerprint = xs ? xs.value : cookieStr.slice(0, 50);

  // Tier 1: appState cookie
  const fromCookie = appState.find(c => c.key === 'fb_dtsg');
  if (fromCookie?.value) return fromCookie.value;

  // Tier 2: cache (same account + same session)
  const hit = _dtsgCache.get(botID);
  if (hit && hit.fingerprint === fingerprint && (Date.now() - hit.at) < CACHE_TTL_MS) {
    return hit.dtsg;
  }

  // Tier 3: HTTP fetch → cache result
  const dtsg = await fetchDtsg(cookieStr);
  if (dtsg) {
    _dtsgCache.set(botID, { dtsg, at: Date.now(), fingerprint });
  }
  return dtsg;
}

// ─────────────────────────────────────────────────────────────────
// GraphQL mutation payload builder
// ─────────────────────────────────────────────────────────────────
function buildPayload(fb_dtsg, botID) {
  const now = Date.now();

  const variables = {
    collectionToken: 'YXBwX2NvbGxlY3Rpb246cGZiaWQwTGlmZ2toNzRtUjFreXNrN0VkU2l6b1d3em9xUUQ0dUNQZlNXUnFRa1pudjRCWlB3Y1RXRVVaVjZ4djd1WmROZkd3Wko3Wllrb0Q2aVFLUWY3Y1VlOEhBNHhrWmhXbA==',
    input: {
      life_event_publish_type: null,
      privacy: {
        allow              : [],
        base_state         : 'EVERYONE',
        deny               : [],
        tag_expansion_state: 'UNSPECIFIED'
      },
      status_const      : 'SINGLE',
      subtitle          : null,
      logging_data      : {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,unexpected,${now},695371,,,;ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,tap_bookmark,${now - 3000},616598,${botID},,`
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
  form.append('jazoest',                  computeJazoest(fb_dtsg)); // ← locally generated ✅
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometUserUpdateRelationshipStatusMutation');
  form.append('variables',               JSON.stringify(variables));
  form.append('doc_id',                  '27314313718254937');
  return form.toString();
}

// ─────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name            : 'relation',
    version         : '2.0',
    author          : 'RIYAD XD',
    countDown       : 10,
    role            : 2,
    shortDescription: 'Set Facebook Relationship Status',
    longDescription : 'Update bot relationship status to Single using GraphQL mutation. jazoest is computed locally — no extra requests.',
    category        : 'owner',
    guide           : { en: '{pn} single' }
  },

  onStart: async function ({ message, args, api }) {
    const status = args[0]?.toLowerCase();

    if (status !== 'single') {
      return message.reply('❌ শুধুমাত্র single সাপোর্ট করে।\nউদাহরণ: /relation single');
    }

    try {
      const appState  = api.getAppState();
      const cookieStr = appState.map(c => `${c.key}=${c.value}`).join('; ');
      const botID     = api.getCurrentUserID();

      // ── Get fb_dtsg (3-tier: cookie → cache → HTTP) ──────────
      let fb_dtsg;
      try {
        fb_dtsg = await getDtsg(appState, botID, cookieStr);
      } catch (e) {
        return message.reply('❌ Facebook connect করতে সমস্যা হয়েছে:\n' + e.message);
      }

      if (!fb_dtsg) {
        return message.reply('❌ fb_dtsg পাওয়া যায়নি। Session expired হতে পারে।');
      }

      // ── Send GraphQL mutation ─────────────────────────────────
      const res = await axios.post(
        'https://www.facebook.com/api/graphql/',
        buildPayload(fb_dtsg, botID),
        {
          timeout: 15000,
          headers: {
            'Content-Type'       : 'application/x-www-form-urlencoded',
            'Cookie'             : cookieStr,
            'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Origin'             : 'https://www.facebook.com',
            'Referer'            : `https://www.facebook.com/profile.php?id=${botID}`,
            'X-FB-Friendly-Name' : 'ProfileCometUserUpdateRelationshipStatusMutation',
            'Sec-Fetch-Site'     : 'same-origin',
            'Sec-Fetch-Mode'     : 'cors'
          }
        }
      );

      // ── Verify response ───────────────────────────────────────
      const updated = res.data?.data?.user_update_relationship_status;
      if (updated) {
        const confirmed = updated.user?.relationship?.status_const === 'SINGLE';
        if (confirmed) {
          return message.reply('✅ সফল! রিলেশনশিপ স্ট্যাটাস Single করা হয়েছে।\n💔 Status: SINGLE confirmed by Facebook!');
        }
        return message.reply('✅ Request পাঠানো হয়েছে! স্ট্যাটাস আপডেট হয়ে থাকতে পারে।');
      }

      // If errors returned by Facebook
      if (res.data?.errors?.length) {
        const errMsg = res.data.errors.map(e => e.message).join('\n');
        // Invalidate cache on auth error so next call fetches fresh token
        _dtsgCache.delete(botID);
        return message.reply('❌ Facebook Error:\n' + errMsg);
      }

      return message.reply('⚠️ অজানা Response। আবার চেষ্টা করুন।');

    } catch (err) {
      console.error('[relation]', err);
      return message.reply('❌ Error: ' + err.message);
    }
  }
};
