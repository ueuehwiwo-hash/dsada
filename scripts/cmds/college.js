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
// CONFIRMED mutation from network capture
// doc_id = 36905639422367929
// fb_api_req_friendly_name = useProfileCometEducationExperienceSaveMutationQuery
// ─────────────────────────────────────────────────────────────────
async function saveCollege(schoolId, fb_dtsg, botID, cookieStr) {
  const now = Date.now();
  const variables = {
    collectionToken: 'YXBwX2NvbGxlY3Rpb246cGZiaWQwTXhUV2FpSDFhYmhqZlZ3RzdjcTRCSFpGekhpRm9FV0ppRUJ2WTFQZks0djE2RmRTcWo4d1RXZ2tDTmhvcGNYdzFwRXJtRFVFVEZMekg2WFJvV2tGdFIybjFzcnFvbA==',
    input: {
      actor_id: botID,
      client_mutation_id: '1',
      activity_ids: [],
      activity_names: [],
      classes: '',
      concentrations: [], // User had Behavioral & Social Health Sciences, but empty works too
      degree_name: '',
      description: '',
      dorm: '',
      end: {},
      has_graduated: true,
      logging_data: {
        nav_chain: `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_education,unexpected,${now},970131,,,;ProfileCometAboutTabRoot.react,comet.profile.collection.directory_work,via_cold_start,${now - 1000},458973,,,`
      },
      mutation_surface: 'PROFILE',
      privacy: {
        allow: [],
        base_state: 'EVERYONE',
        deny: [],
        tag_expansion_state: 'UNSPECIFIED'
      },
      school_id: schoolId,
      school_name: null,
      school_type: 'college',
      start: {}
    },
    scale: 1,
    sectionToken: 'YXBwX3NlY3Rpb246NjE1ODI2MjgyMzE3Mjg6MjMyNzE1ODIyNw==',
    profileID: botID,
    educationExperienceID: null,
    useDefaultActor: false,
    shouldFetchPostClick: false
  };

  const form = new URLSearchParams();
  form.append('fb_dtsg',                  fb_dtsg);
  form.append('jazoest',                  computeJazoest(fb_dtsg));
  form.append('fb_api_caller_class',      'RelayModern');
  form.append('fb_api_req_friendly_name', 'useProfileCometEducationExperienceSaveMutationQuery');
  form.append('server_timestamps',        'true');
  form.append('variables',               JSON.stringify(variables));
  form.append('doc_id',                  '36905639422367929'); // ← CONFIRMED

  const res = await axios.post('https://www.facebook.com/api/graphql/', form.toString(), {
    timeout: 15000,
    headers: {
      'Content-Type'       : 'application/x-www-form-urlencoded',
      'Cookie'             : cookieStr,
      'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Origin'             : 'https://www.facebook.com',
      'Referer'            : `https://www.facebook.com/profile.php?id=${botID}&sk=directory_education`,
      'Sec-Fetch-Site'     : 'same-origin',
      'Sec-Fetch-Mode'     : 'cors'
    }
  });

  return res.data;
}

// ─────────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name            : 'college',
    version         : '1.0',
    author          : 'RIYAD XD',
    countDown       : 10,
    role            : 2,
    shortDescription: 'Set Facebook College/University',
    longDescription : 'Update bot education experience via GraphQL mutation. Usage: /college <Facebook Page ID>',
    category        : 'owner',
    guide           : {
      en: '{pn} <Facebook Page ID>\nExample: {pn} 100064422774525'
    }
  },

  onStart: async function ({ message, args, api }) {
    if (!args[0]) {
      return message.reply(
        '🎓 College/University সেট করুন!\n\n' +
        'ব্যবহার:\n' +
        '• /college <Facebook Page ID>\n\n' +
        'উদাহরণ: /college 100064422774525 (New York Film Academy এর পেজ আইডি)'
      );
    }

    const appState  = api.getAppState();
    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join('; ');
    const botID     = api.getCurrentUserID();

    let fb_dtsg;
    try {
      fb_dtsg = await getDtsg(appState, botID, cookieStr);
    } catch (e) {
      return message.reply('❌ Facebook connect করতে সমস্যা:\n' + e.message);
    }
    if (!fb_dtsg) return message.reply('❌ fb_dtsg পাওয়া যায়নি। Session expired হতে পারে।');

    const query = args.join(' ').trim();
    let schoolId = null;
    
    if (/^\d+$/.test(query)) {
      schoolId = query;
    } else if (query.toLowerCase().startsWith('id:')) {
      schoolId = query.slice(3).trim();
    } else {
      return message.reply('❌ শুধুমাত্র Facebook Page ID দিতে পারবেন।\nউদাহরণ: /college 100064422774525');
    }

    if (schoolId && !isNaN(schoolId)) {
      await message.reply(`⏳ College ID [${schoolId}] detect হয়েছে। University সেট করা হচ্ছে...`);
      try {
        const res = await saveCollege(schoolId, fb_dtsg, botID, cookieStr);
        const saved = res?.data?.education_experience_save;
        if (saved) {
          const name = saved.viewer?.actor?.education_experience?.school?.name || `ID: ${schoolId}`;
          return message.reply(`✅ সফল! College/University সেট হয়েছে:\n🎓 Studied at ${name}`);
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
