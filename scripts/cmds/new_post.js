module.exports = {
  config: {
    name: "new_post",
    version: "1.0",
    author: "RIYAD XD",
    countDown: 10,
    role: 2, // Only Owner can create posts
    shortDescription: "Create a new post on your Facebook profile",
    longDescription: "Creates a new public status post on the bot's Facebook profile. Only the bot owner can use this command.",
    category: "owner",
    guide: {
      en: "{pn} <your post text here>"
    }
  },

  onStart: async function ({ message, args, api }) {
    if (args.length === 0) {
      return message.reply("❌ অনুগ্রহ করে পোস্টের টেক্সট দিন। যেমন: /new_post hello");
    }

    const postText = args.join(" ");

    if (typeof api.createPost !== "function") {
      return message.reply("❌ দুঃখিত, আপনার বট অ্যাকাউন্টের FCA ভার্সনে অটো-পোস্ট সাপোর্ট নেই।");
    }

    try {
      api.createPost({
        body: postText,
        privacy: { value: 'EVERYONE' } // Public post
      }, (err, info) => {
        let isSuccess = false;
        let postUrl = "";

        if (!err && info) {
            isSuccess = true;
            postUrl = info.postUrl || info.url || "";
        } else if (err && err.data && err.data.story_create) {
            // The mutation executed but returned some field errors, post is usually still created
            isSuccess = true;
            try {
                if (err.data.story_create.story && err.data.story_create.story.url) {
                    postUrl = err.data.story_create.story.url;
                } else if (err.data.story_create.post_id) {
                    postUrl = "https://facebook.com/" + err.data.story_create.post_id;
                }
            } catch (e) {}
        }

        if (!isSuccess) {
          console.error("Create Post Error:", err);
          return message.reply("❌ পোস্ট তৈরি করতে সমস্যা হয়েছে! এটি স্প্যাম ফিল্টারে ব্লক হতে পারে অথবা অন্য কোনো সার্ভার এরর হয়েছে।");
        }
        
        let replyMsg = `✅ ১০০% নিশ্চিত! আপনার নতুন পোস্ট সফলভাবে করা হয়েছে!\n\n📝 টেক্সট: ${postText}`;
        if (postUrl) {
            replyMsg += `\n\n🔗 পোস্ট লিংক: ${postUrl}`;
        }
        
        return message.reply(replyMsg);
      });
    } catch (error) {
      console.error(error);
      return message.reply("❌ পোস্ট করার সময় একটি অজানা এরর হয়েছে।");
    }
  }
};
