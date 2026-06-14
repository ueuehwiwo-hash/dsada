module.exports = {
  config: {
    name: "bio",
    version: "1.0",
    author: "RIYAD XD",
    countDown: 5,
    role: 2, // Owner only
    shortDescription: "Update bot's profile bio",
    longDescription: "Update the bot's Facebook profile bio with your given text.",
    category: "owner",
    guide: {
      en: "{pn} <your bio text here>"
    }
  },

  onStart: async function ({ message, args, api }) {
    if (typeof api.changeBio !== "function") {
      return message.reply("❌ দুঃখিত, আপনার বট অ্যাকাউন্টের FCA ভার্সনে বায়ো (Bio) আপডেট সাপোর্ট নেই।");
    }

    const bioText = args.join(" ");
    if (!bioText) {
      return message.reply("❌ আপনি বায়োতে কী লিখতে চান তা জানান। উদাহরণ: /bio Welcome to my profile!");
    }

    try {
      // Some API versions take a boolean for publishing to newsfeed: api.changeBio(text, publish, callback)
      // Others take just: api.changeBio(text, callback)
      const callback = (err) => {
        if (err) {
          console.error("Change Bio Error:", err);
          return message.reply("❌ বায়ো আপডেট করতে সমস্যা হয়েছে! কনসোল লগ চেক করুন।");
        }
        return message.reply(`✅ ১০০% নিশ্চিত! আপনার প্রোফাইলের বায়ো সফলভাবে আপডেট হয়েছে!\n\n📝 নতুন বায়ো: ${bioText}`);
      };

      if (api.changeBio.length >= 3) {
          api.changeBio(bioText, false, callback);
      } else {
          api.changeBio(bioText, callback);
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ বায়ো আপডেট করতে অজানা সমস্যা হয়েছে।");
    }
  }
};
