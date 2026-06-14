const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "emoji_voice",
    version: "2.4.79",
    author: "Hasib ",
    countDown: 5,
    role: 0,
    shortDescription: "Emoji দিলে কিউট মেয়ের ভয়েস পাঠাবে 😍",
    longDescription: "Send specific emojis to get cute girl voice audios",
    category: "noprefix",
    guide: {
      en: "Just send an emoji like 😘 🥰 😍 etc."
    }
  },

  // === Emoji to Voice Map ===
  emojiAudioMap: {
    "🥱": "assets/9pou40.mp3",
    "😁": "assets/60cwcg.mp3",
    "😌": "assets/epqwbx.mp3",
    "🥺": "assets/wc17iq.mp3",
    "🤭": "assets/cu0mpy.mp3",
    "😅": "assets/jl3pzb.mp3",
    "😏": "assets/z9e52r.mp3",
    "😞": "assets/tdimtx.mp3",
    "🤫": "assets/0uii99.mp3",
    "🍼": "assets/p6ht91.mp3",
    "🤔": "__dirname + "/assets/hy6m6w.mp3"",
    "🥰": "__dirname + "/assets/dv9why.mp3"",
    "🤦": "__dirname + "/assets/ivlvoq.mp3"",
    "😘": "__dirname + "/assets/sbws0w.mp3"",
    "😑": "__dirname + "/assets/p78xfw.mp3"",
    "😢": "__dirname + "/assets/shxwj1.mp3"",
    "🙊": "__dirname + "/assets/3bejxv.mp3"",
    "🤨": "__dirname + "/assets/4aci0r.mp3"",
    "😡": "__dirname + "/assets/shxwj1.mp3"",
    "🙈": "__dirname + "/assets/3qc90y.mp3"",
    "😍": "__dirname + "/assets/qjfk1b.mp3"",
    "😭": "__dirname + "/assets/itm4g0.mp3"",
    "😱": "__dirname + "/assets/mu0kka.mp3"",
    "😻": "__dirname + "/assets/y8ul2j.mp3"",
    "😿": "__dirname + "/assets/tqxemm.mp3"",
    "💔": "__dirname + "/assets/6yanv3.mp3"",
    "🤣": "__dirname + "/assets/2sweut.mp3"",
    "🥹": "__dirname + "/assets/jf85xe.mp3"",
    "😩": "__dirname + "/assets/b4m5aj.mp3"",
    "🫣": "__dirname + "/assets/ttb6hi.mp3"",
    "🐸": "__dirname + "/assets/utl83s.mp3""
  },

  // === Runs only when emoji matches (no prefix needed) ===
  onChat: async function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body || body.length > 2) return;

    const emoji = body.trim();
    const audioUrl = this.emojiAudioMap[emoji];
    if (!audioUrl) return;

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(cacheDir, `${encodeURIComponent(emoji)}.mp3`);

    try {
      const response = await axios({
        method: "GET",
        url: audioUrl,
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage(
          { attachment: fs.createReadStream(filePath) },
          threadID,
          () => fs.unlink(filePath, () => {}),
          messageID
        );
      });

      writer.on("error", (err) => {
        console.error("File write error:", err);
        api.sendMessage("ইমুজি দিয়ে লাভ নাই\nযাও মুড়ি খাও জান😘", threadID, messageID);
      });
    } catch (error) {
      console.error("Download error:", error);
      api.sendMessage("ইমুজি দিয়ে লাভ নাই\nযাও মুড়ি খাও জান😘", threadID, messageID);
    }
  },

  onStart: async function () {
    // Not needed for noprefix, but kept for framework consistency
  }
};
