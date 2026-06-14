const axios = require('axios');

// ─────────────────────────────────────────────────────────────────
// Per-account fb_dtsg cache
// ─────────────────────────────────────────────────────────────────
const _dtsgCache   = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Facebook's confirmed jazoest algorithm (tested ✅)
function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

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
  let m = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (m) return m[1];
  m = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
  return m ? m[1] : null;
}

async function getDtsg(appState, botID, cookieStr) {
  const xs          = appState.find(c => c.key === 'xs');
  const fingerprint = xs ? xs.value : cookieStr.slice(0, 50);
  const fromCookie  = appState.find(c => c.key === 'fb_dtsg');
  if (fromCookie?.value) return fromCookie.value;
  const hit = _dtsgCache.get(botID);
  if (hit && hit.fingerprint === fingerprint && (Date.now() - hit.at) < CACHE_TTL_MS) return hit.dtsg;
  const dtsg = await fetchDtsg(cookieStr);
  if (dtsg) _dtsgCache.set(botID, { dtsg, at: Date.now(), fingerprint });
  return dtsg;
}

// ─────────────────────────────────────────────────────────────────
// Search for a city → returns [{id, name}]
// Uses Facebook's internal location typeahead GraphQL
// ─────────────────────────────────────────────────────────────────
async function searchCity(query, fb_dtsg, cookieStr) {
  const variables = {
    params: {
      caller     : 'PROFILE_EDITOR',
      city_field : 'HOMETOWN',
      max_results: 5,
      query,
      scale      : 1
    }
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownTypeaheadSearchQuery');
  form.append('variables',               JSON.stringify(variables));
  form.append('server_timestamps',        'true');
  form.append('doc_id',                  '7823264637693803');

  const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
    timeout: 15000,
    headers: {
      'Content-Type'       : 'application/x-www-form-urlencoded',
      'Cookie'             : cookieStr,
      'User-Agent'         : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'Origin'             : 'https://www.facebook.com',
      'Referer'            : 'https://www.facebook.com/',
      'X-FB-Friendly-Name': 'ProfileCometHometownTypeaheadSearchQuery',
      'Sec-Fetch-Site'     : 'same-origin',
      'Sec-Fetch-Mode'     : 'cors'
    }
  });

  const data = res.data;

  // Try known response paths for city typeahead
  const nodes =
    data?.data?.city_typeahead?.results ||
    data?.data?.city_search?.results   ||
    [];

  if (nodes.length > 0) {
    return nodes.map(r => ({
      id  : r.node?.id   || r.id,
      name: r.node?.name || r.name || r.text
    })).filter(r => r.id && r.name);
  }

  // Fallback: search Facebook Pages for city name
  return await searchCityFallback(query, fb_dtsg, cookieStr);
}

// Fallback: use keyword search on Facebook Pages
async function searchCityFallback(query, fb_dtsg, cookieStr) {
  const variables = {
    count   : 5,
    query,
    scale   : 1,
    filters : JSON.stringify([{ name: 'places', args: '' }])
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'SearchCometResultsInitialResultsQuery');
  form.append('variables',               JSON.stringify(variables));
  form.append('doc_id',                  '7072359379459552');

  try {
    const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
      timeout: 15000,
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

    const edges = res.data?.data?.serpResponse?.results?.edges || [];
    return edges
      .map(e => e.relay_rendering_strategy?.view_model?.profile)
      .filter(p => p?.id && p?.name)
      .map(p => ({ id: p.id, name: p.name }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function saveHometown(cityId, fb_dtsg, botID, cookieStr) {
  const now = Date.now();
  const sectionToken = Buffer.from(`app_section:${botID}:2327158227`).toString('base64');
  const collectionToken = Buffer.from(`app_collection:${botID}`).toString('base64');

  const variables = {
    collectionToken: collectionToken,
    input: {
      hometown_city_id        : cityId,
      life_event_publish_type : 'SUPPRESS_ALL',
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
    sectionToken   : sectionToken,
    profileID      : botID,
    useDefaultActor: false
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometHometownProfileFieldSaveMutation');
  form.append('variables',               JSON.stringify(variables));
  form.append('server_timestamps',        'true');
  form.append('doc_id',                  '36114066758239170'); // ← CONFIRMED from network ✅

  const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
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

  return res.data;
}

// ─────────────────────────────────────────────────────────────────
// Pending: threadID → { results, fb_dtsg, cookieStr, botID }
// ─────────────────────────────────────────────────────────────────
const _pending = new Map();

// ─────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name            : 'home',
    version         : '2.0',
    author          : 'RIYAD XD',
    countDown       : 10,
    role            : 2,
    shortDescription: 'Set Facebook Hometown',
    longDescription : 'Update bot hometown via confirmed GraphQL mutation (doc_id: 36114066758239170). Search for a city and set it.',
    category        : 'owner',
    guide           : {
      en: '{pn} <city name>  — search and pick\n' +
          '{pn} id:<city_id> — set directly by Facebook Page ID\n' +
          'Example: {pn} New York\n' +
          'Example: {pn} id:112825018731802'
    }
  },

  onStart: async function ({ message, args, api, event }) {
    if (!args[0]) {
      return message.reply(
        '🏠 Hometown সেট করুন!\n\n' +
        'ব্যবহার:\n' +
        '• /home <শহরের নাম>  → search করে বেছে নিন\n' +
        '• /home id:<city_id> → সরাসরি ID দিয়ে সেট করুন\n\n' +
        'উদাহরণ: /home New York\n' +
        'উদাহরণ: /home id:112825018731802'
      );
    }

    const appState  = api.getAppState();
    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join('; ');
    const botID     = api.getCurrentUserID();

    // Get fb_dtsg
    let fb_dtsg;
    try {
      fb_dtsg = await getDtsg(appState, botID, cookieStr);
    } catch (e) {
      return message.reply('❌ Facebook connect করতে সমস্যা:\n' + e.message);
    }
    if (!fb_dtsg) return message.reply('❌ fb_dtsg পাওয়া যায়নি। Session expired হতে পারে।');

    // ── Direct ID mode (Auto Detect) ──────────────
    const query = args.join(' ').trim();
    const rawArg = args[0].toLowerCase();
    
    // Check if the input is entirely numeric (e.g., 112825018731802) or starts with id:
    let cityId = null;
    if (/^\d+$/.test(query)) {
      cityId = query;
    } else if (rawArg.startsWith('id:')) {
      cityId = args[0].slice(3).trim();
    }

    if (cityId && !isNaN(cityId)) {
      await message.reply(`⏳ City ID [${cityId}] detect হয়েছে। Hometown সেট করা হচ্ছে...`);
      try {
        const res  = await saveHometown(cityId, fb_dtsg, botID, cookieStr);
        const saved = res?.data?.hometown_profile_field_save;
        if (saved) {
          const name = saved.viewer?.actor?.hometown?.name || `ID: ${cityId}`;
          return message.reply(`✅ সফল! Hometown সেট হয়েছে:\n🏠 ${name}`);
        }
        if (res?.errors?.length) {
          _dtsgCache.delete(botID);
          return message.reply('❌ Facebook Error:\n' + res.errors.map(e => e.message).join('\n'));
        }
        return message.reply('⚠️ Profile চেক করুন।\n' + JSON.stringify(res).substring(0, 150));
      } catch (e) {
        return message.reply('❌ Error:\n' + e.message);
      }
    }

    // ── Search mode: /home New York ───────────────────────────

    // Search for city
    await message.reply(`🔍 "${query}" খুঁজছি...`);

    let results;
    try {
      results = await searchCity(query, fb_dtsg, cookieStr);
    } catch (e) {
      return message.reply('❌ Location search error:\n' + e.message);
    }

    if (!results || results.length === 0) {
      return message.reply(
        `❌ "${query}" নামে কোনো location পাওয়া যায়নি।\n` +
        `💡 টিপস: ইংরেজিতে city name দিন (যেমন: Dhaka, Cox's Bazar, New York)`
      );
    }

    // Show result list
    const list = results.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
    await message.reply(
      `📍 "${query}" এর জন্য ${results.length}টি location পাওয়া গেছে:\n\n` +
      `${list}\n\n` +
      `📩 নম্বর দিয়ে reply করুন (1-${results.length})\n` +
      `ক্যান্সেল করতে 0 লিখুন।`
    );

    _pending.set(event.threadID, { results, fb_dtsg, cookieStr, botID });
  },

  onReply: async function ({ message, args, event }) {
    const pending = _pending.get(event.threadID);
    if (!pending) return;

    const choice = parseInt(args[0]);

    if (isNaN(choice) || choice === 0) {
      _pending.delete(event.threadID);
      return message.reply('❌ বাতিল করা হয়েছে।');
    }

    const { results, fb_dtsg, cookieStr, botID } = pending;

    if (choice < 1 || choice > results.length) {
      return message.reply(`❌ 1 থেকে ${results.length}-এর মধ্যে নম্বর দিন।`);
    }

    const selected = results[choice - 1];
    _pending.delete(event.threadID);

    await message.reply(`⏳ "${selected.name}" সেট করা হচ্ছে...`);

    try {
      const res = await saveHometown(selected.id, fb_dtsg, botID, cookieStr);

      // ✅ Confirmed response key from network capture
      const saved = res?.data?.hometown_profile_field_save;
      if (saved) {
        const confirmedName = saved.viewer?.actor?.hometown?.name || selected.name;
        return message.reply(
          `✅ সফল! আপনার Hometown সেট হয়েছে:\n` +
          `🏠 ${confirmedName}`
        );
      }

      if (res?.errors?.length) {
        _dtsgCache.delete(botID); // invalidate on auth error
        return message.reply('❌ Facebook Error:\n' + res.errors.map(e => e.message).join('\n'));
      }

      return message.reply(
        `⚠️ অস্পষ্ট response। Profile চেক করুন।\n` +
        `Preview: ${JSON.stringify(res).substring(0, 150)}`
      );

    } catch (e) {
      return message.reply('❌ Error:\n' + e.message);
    }
  }
};
