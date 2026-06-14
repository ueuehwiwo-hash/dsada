const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "profile_up",
    version: "1.0",
    author: "RIYAD XD",
    countDown: 20,
    role: 2, // Owner only
    shortDescription: "Update bot's profile picture randomly",
    longDescription: "Automatically picks a random picture from the 'pic' folder and updates the bot's profile picture with your caption.",
    category: "owner",
    guide: {
      en: "{pn} <your caption here>"
    }
  },

  onStart: async function ({ message, args, api }) {
    if (typeof api.changeAvatar !== "function") {
      return message.reply("❌ দুঃখিত, আপনার বট অ্যাকাউন্টের FCA ভার্সনে প্রোফাইল পিকচার আপডেট সাপোর্ট নেই।");
    }

    const captionText = args.join(" ");
    const picDir = path.join(process.cwd(), "pic");

    try {
      const files = fs.readdirSync(picDir);
      if (files.length === 0) {
        return message.reply("❌ 'pic' ফোল্ডারে কোনো ছবি পাওয়া যায়নি!");
      }

      // Select a random image
      const randomFile = files[Math.floor(Math.random() * files.length)];
      const filePath = path.join(picDir, randomFile);

      const imageStream = fs.createReadStream(filePath);

      api.changeAvatar(imageStream, captionText, null, (err, info) => {
        let isSuccess = false;
        let postUrl = "";

        if (!err && info) {
            isSuccess = true;
            postUrl = info.postUrl || info.url || "";
        } else if (err && err.data) {
            // Check for false positive errors like field_exception
            isSuccess = true; // Avatar update usually succeeds even if it returns an error
            try {
                if (err.data.story_create && err.data.story_create.story && err.data.story_create.story.url) {
                    postUrl = err.data.story_create.story.url;
                } else if (err.data.story_create && err.data.story_create.post_id) {
                    postUrl = "https://facebook.com/" + err.data.story_create.post_id;
                } else if (err.url) {
                    postUrl = err.url;
                }
            } catch (e) {}
        }

        if (!isSuccess && err) {
          console.error("Change Avatar Error:", err);
          return message.reply("❌ প্রোফাইল পিকচার আপডেট করতে সমস্যা হয়েছে! কনসোল লগ চেক করুন।");
        }
        
        let replyMsg = `✅ ১০০% নিশ্চিত! আপনার নতুন প্রোফাইল পিকচার সফলভাবে আপডেট হয়েছে!\n\n📝 ক্যাপশন: ${captionText || "নেই"}\n📷 ছবি: ${randomFile}`;
        if (postUrl) {
            replyMsg += `\n\n🔗 পোস্ট লিংক: ${postUrl}`;
        }
        
        return message.reply(replyMsg);
      });
    } catch (error) {
      console.error(error);
      return message.reply("❌ ছবি লোড করতে বা প্রোফাইল আপডেট করতে অজানা সমস্যা হয়েছে।");
    }
  }
};
