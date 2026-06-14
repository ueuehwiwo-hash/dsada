const axios = require('axios');

// ─────────────────────────────────────────────────────────────────
// Per-account fb_dtsg cache
// ─────────────────────────────────────────────────────────────────
const _dtsgCache   = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function computeJazoest(dtsg) {
  let n = 0;
  for (let i = 0; i < dtsg.length; i++) n += dtsg.charCodeAt(i);
  return '2' + n;
}

async function fetchDtsg(cookieStr) {
  // ⚠️ MUST use desktop UA
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

async function scrapeToken(botID, cookieStr) {
  const url = `https://www.facebook.com/profile.php?id=${botID}&sk=about_work_and_education`;
  try {
    const res = await axios.get(url, {
      headers: {
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const m = res.data.match(/(YXBwX2NvbGxlY3Rpb246[^"'\\]+)/);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// CONFIRMED mutation from network capture
// doc_id = 27610779128560301
// fb_api_req_friendly_name = ProfileCometWorkExperienceSaveMutation
// ─────────────────────────────────────────────────────────────────
async function saveWorkplace(employerId, fb_dtsg, botID, cookieStr) {
  const now = Date.now();
  const sectionToken = Buffer.from(`app_section:${botID}:2327158227`).toString('base64');
  const collectionToken = await scrapeToken(botID, cookieStr) || '';

  const variables = {
    collectionToken: collectionToken,
    input: {
      description: '',
      employer_id: employerId,
      employer_name: null,
      end_date: {},
      is_current: true,
      location_id: '',
      logging_data: {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_work,unexpected,${now},710896,,,;ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,via_cold_start,${now - 1000},203070,,,`
      },
      mutation_surface: 'PROFILE',
      position_id: '',
      position_name: '',
      privacy: {
        allow: [],
        base_state: 'EVERYONE',
        deny: [],
        tag_expansion_state: 'UNSPECIFIED'
      },
      start_date: {},
      actor_id: botID,
      client_mutation_id: '4'
    },
    scale: 1,
    sectionToken: sectionToken,
    profileID: botID,
    workExperienceID: null,
    useDefaultActor: false,
    isProfileDirectory: true,
    shouldFetchPostClick: false
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'ProfileCometWorkExperienceSaveMutation');
  form.append('server_timestamps',        'true');
  form.append('variables',               JSON.stringify(variables));
  form.append('doc_id',                  '27610779128560301'); // ← CONFIRMED

  const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
    timeout: 15000,
    headers: {
      'Content-Type'       : 'application/x-www-form-urlencoded',
      'Cookie'             : cookieStr,
      'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Origin'             : 'https://www.facebook.com',
      'Referer'            : `https://www.facebook.com/profile.php?id=${botID}&sk=directory_work`,
      'Sec-Fetch-Site'     : 'same-origin',
      'Sec-Fetch-Mode'     : 'cors'
    }
  });

  return res.data;
}

// ─────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name            : 'work',
    version         : '1.0',
    author          : 'RIYAD XD',
    countDown       : 10,
    role            : 2,
    shortDescription: 'Set Facebook Workplace (Job)',
    longDescription : 'Update bot work experience via GraphQL mutation. Usage: /work <Facebook Page ID>',
    category        : 'owner',
    guide           : {
      en: '{pn} <Facebook Page ID>\nExample: {pn} 20531316728'
    }
  },

  onStart: async function ({ message, args, api }) {
    if (!args[0]) {
      return message.reply(
        '💼 Workplace/Job সেট করুন!\n\n' +
        'ব্যবহার:\n' +
        '• /work <Facebook Page ID>\n\n' +
        'উদাহরণ: /work 100064860875397 (Facebook এর পেজ আইডি)'
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

    // Clean input ID
    const query = args.join(' ').trim();
    let employerId = null;
    
    // Auto-detect numeric ID or id: prefix
    if (/^\d+$/.test(query)) {
      employerId = query;
    } else if (query.toLowerCase().startsWith('id:')) {
      employerId = query.slice(3).trim();
    } else {
      return message.reply('❌ শুধুমাত্র Facebook Page ID দিতে পারবেন।\nSearch অপশন যোগ করা হয়নি, তাই সরাসরি ID দিন।\nউদাহরণ: /work 100064860875397');
    }

    if (employerId && !isNaN(employerId)) {
      await message.reply(`⏳ Employer ID [${employerId}] detect হয়েছে। Workplace সেট করা হচ্ছে...`);
      try {
        const res = await saveWorkplace(employerId, fb_dtsg, botID, cookieStr);
        const saved = res?.data?.work_experience_save;
        if (saved) {
          const name = saved.viewer?.actor?.work_experience?.employer?.name || `ID: ${employerId}`;
          return message.reply(`✅ সফল! Workplace সেট হয়েছে:\n💼 Works at ${name}`);
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
  }
};
