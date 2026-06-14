const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "cover_up",
    version: "1.0",
    author: "RIYAD XD",
    countDown: 20,
    role: 2, // Owner only
    shortDescription: "Update bot's cover photo randomly",
    longDescription: "Automatically picks a random picture from the 'pic' folder and updates the bot's cover photo.",
    category: "owner",
    guide: {
      en: "{pn} <your caption here>"
    }
  },

  onStart: async function ({ message, args, api }) {
    if (typeof api.changeCover !== "function" && typeof api.changeCoverImage !== "function") {
      return message.reply("❌ দুঃখিত, আপনার বট অ্যাকাউন্টের FCA ভার্সনে কভার ফটো আপডেট সাপোর্ট নেই।");
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
      
      const changeCoverFunc = api.changeCover || api.changeCoverImage;

      changeCoverFunc(imageStream, captionText, null, (err, info) => {
        let isSuccess = false;
        let postUrl = "";

        if (!err && info) {
            isSuccess = true;
            if (typeof info === "string") postUrl = info;
            else postUrl = info.postUrl || info.url || "";
        } else if (err && err.data) {
            isSuccess = true; 
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

        if (!postUrl && isSuccess) {
            postUrl = "https://www.facebook.com/profile.php?id=" + api.getCurrentUserID();
        }

        if (!isSuccess && err) {
          console.error("Change Cover Error:", err);
          return message.reply("❌ কভার ফটো আপডেট করতে সমস্যা হয়েছে! কনসোল লগ চেক করুন।");
        }
        
        let replyMsg = `✅ ১০০% নিশ্চিত! আপনার নতুন কভার ফটো সফলভাবে আপডেট হয়েছে!\n\n📝 ক্যাপশন: ${captionText || "নেই"}\n📷 ছবি: ${randomFile}`;
        if (postUrl) {
            replyMsg += `\n\n🔗 পোস্ট লিংক: ${postUrl}`;
        }
        
        return message.reply(replyMsg);
      });
    } catch (error) {
      console.error(error);
      return message.reply("❌ ছবি লোড করতে বা কভার আপডেট করতে অজানা সমস্যা হয়েছে।");
    }
  }
};
