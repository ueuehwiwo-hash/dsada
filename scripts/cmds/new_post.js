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
        if (err) {
          console.error("Create Post Error:", err);
          return message.reply("❌ পোস্ট তৈরি করতে সমস্যা হয়েছে! কনসোল লগ চেক করুন।");
        }
        return message.reply(`✅ আপনার নতুন পোস্ট সফলভাবে করা হয়েছে!\n\n📝 টেক্সট: ${postText}`);
      });
    } catch (error) {
      console.error(error);
      return message.reply("❌ পোস্ট করার সময় একটি অজানা এরর হয়েছে।");
    }
  }
};
