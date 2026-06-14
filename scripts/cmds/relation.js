const axios = require('axios');

module.exports = {
  config: {
    name: "relation",
    version: "1.0",
    author: "RIYAD XD",
    countDown: 10,
    role: 2, // Owner only
    shortDescription: "Set Facebook Relationship Status",
    longDescription: "Update your bot's relationship status using raw GraphQL mutations.",
    category: "owner",
    guide: {
      en: "{pn} single"
    }
  },

  onStart: async function ({ message, args, api }) {
    const statusType = args[0]?.toLowerCase();
    
    if (statusType !== "single") {
      return message.reply("❌ বর্তমানে শুধুমাত্র 'single' স্ট্যাটাস সাপোর্ট করে। উদাহরণ: /relation single");
    }

    try {
      // Get bot's cookies from FCA
      const appState = api.getAppState();
      const cookieStr = appState.map(c => `${c.key}=${c.value}`).join('; ');
      const botID = api.getCurrentUserID();

      let fb_dtsg = "";
      let jazoest = "";
      
      try {
        // Fetch Facebook homepage to get fresh fb_dtsg and jazoest tokens
        const res = await axios.get("https://www.facebook.com/profile.php", {
          headers: {
            "Cookie": cookieStr,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "sec-fetch-site": "none",
            "sec-fetch-mode": "navigate",
            "sec-fetch-user": "?1",
            "sec-fetch-dest": "document"
          }
        });

        const dtsgMatch = res.data.match(/"name":"fb_dtsg","value":"([^"]+)"/);
        const jazoestMatch = res.data.match(/"name":"jazoest","value":"([^"]+)"/);
        
        if (dtsgMatch) fb_dtsg = dtsgMatch[1];
        if (jazoestMatch) jazoest = jazoestMatch[1];

        if (!fb_dtsg) {
            const altDtsgMatch = res.data.match(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/);
            if (altDtsgMatch) fb_dtsg = altDtsgMatch[1];
        }
      } catch (err) {
        return message.reply("❌ GET request error (fb_dtsg): " + err.message);
      }

      if (!fb_dtsg) {
        return message.reply("❌ ফেসবুকের সিকিউরিটি টোকেন (fb_dtsg) এক্সট্র্যাক্ট করতে ব্যর্থ হয়েছি।");
      }

      const sectionToken = "YXBwX3NlY3Rpb246NjE1ODI2MjgyMzE3Mjg6MjMyNzE1ODIyNw==";
      const collectionToken = "YXBwX2NvbGxlY3Rpb246cGZiaWQwTGlmZ2toNzRtUjFreXNrN0VkU2l6b1d3em9xUUQ0dUNQZlNXUnFRa1pudjRCWlB3Y1RXRVVaVjZ4djd1WmROZkd3Wko3Wllrb0Q2aVFLUWY3Y1VlOEhBNHhrWmhXbA==";

      const variables = {
        "collectionToken": collectionToken,
        "input": {
          "life_event_publish_type": null,
          "privacy": {
            "allow": [],
            "base_state": "EVERYONE",
            "deny": [],
            "tag_expansion_state": "UNSPECIFIED"
          },
          "status_const": "SINGLE",
          "subtitle": null,
          "logging_data": {
            "nav_chain": `ProfileCometAboutTabRoot.react,comet.profile.collection.directory_personal_details,unexpected,${Date.now()},695371,,,;ProfileCometTimelineListViewRoot.react,comet.profile.timeline.list,tap_bookmark,${Date.now()-3000},616598,${botID},,`
          },
          "actor_id": botID,
          "client_mutation_id": "2"
        },
        "scale": 1,
        "sectionToken": sectionToken,
        "useDefaultActor": false
      };

      const formData = new URLSearchParams();
      formData.append('fb_dtsg', fb_dtsg);
      formData.append('jazoest', jazoest);
      formData.append('fb_api_caller_class', 'RelayModern');
      formData.append('fb_api_req_friendly_name', 'ProfileCometUserUpdateRelationshipStatusMutation');
      formData.append('variables', JSON.stringify(variables));
      formData.append('doc_id', '27314313718254937');

      try {
        const mutationRes = await axios.post("https://www.facebook.com/api/graphql/", formData.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookieStr,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Origin": "https://www.facebook.com",
            "Referer": `https://www.facebook.com/profile.php?id=${botID}`,
            "X-FB-Friendly-Name": "ProfileCometUserUpdateRelationshipStatusMutation",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors"
          }
        });

        if (mutationRes.data && mutationRes.data.data && mutationRes.data.data.user_update_relationship_status) {
          return message.reply("✅ ১০০% নিশ্চিত! আপনার রিলেশনশিপ স্ট্যাটাস সফলভাবে Single করা হয়েছে!");
        } else {
          return message.reply("❌ স্ট্যাটাস আপডেট হয়েছে কিনা নিশ্চিত নয়। রেসপন্স: " + JSON.stringify(mutationRes.data).substring(0, 100));
        }
      } catch (err) {
        return message.reply("❌ POST request error (GraphQL): " + err.message);
      }
      
    } catch (error) {
      console.error(error);
      return message.reply("❌ Unknown Error: " + error.message);
    }
  }
};
