const fs = require('fs');
const path = require('path');

const replacements = [
    { file: "scripts/cmds/customrankcard.js", find: '"https://i.ibb.co/BZ2Qgs1/image.png"', replace: '__dirname + "/assets/customrankcard_bg1.png"' },
    { file: "scripts/cmds/customrankcard.js", find: '"https://i.ibb.co/wy1ZHHL/image.png"', replace: '__dirname + "/assets/customrankcard_bg2.png"' },
    { file: "scripts/cmds/hug.js", find: '"https://files.catbox.moe/qxovn9.jpg"', replace: '__dirname + "/assets/hug_bg.jpg"' },
    { file: "scripts/cmds/kiss.js", find: '"https://files.catbox.moe/6qg782.jpg"', replace: '__dirname + "/assets/kiss_bg.jpg"' },
    { file: "scripts/cmds/marry.js", find: '"https://files.catbox.moe/pxougj.jpg"', replace: '__dirname + "/assets/marry_bg.jpg"' },
    { file: "scripts/cmds/pair.js", find: '"https://files.catbox.moe/29jl5s.jpg"', replace: '__dirname + "/assets/pair_bg.jpg"' },
    { file: "scripts/cmds/richest.js", find: '"https://i.imgur.com/gK9u5iL.png"', replace: '__dirname + "/assets/richest_bg.png"' },
    { file: "scripts/cmds/info.js", find: '"https://i.ibb.co.com/B52s0L6G/2a3b08a991cb.jpg"', replace: '__dirname + "/assets/info_bg.jpg"' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/9shyYH1/moon-0.png', replace: 'assets/moon-0.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/vBXLL37/moon-1.png', replace: 'assets/moon-1.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/0QCKK9D/moon-2.png', replace: 'assets/moon-2.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/Dp62X2j/moon-3.png', replace: 'assets/moon-3.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/xFKCtfd/moon-4.png', replace: 'assets/moon-4.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/m4L533L/moon-5.png', replace: 'assets/moon-5.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/VmshdMN/moon-6.png', replace: 'assets/moon-6.png' },
    { file: "scripts/cmds/moon.js", find: 'https://i.ibb.co/4N7R2B2/moon-7.png', replace: 'assets/moon-7.png' },
    { file: "scripts/cmds/moon.js", find: 'await loadImage(link[Math.floor(Math.random() * link.length)])', replace: 'await loadImage(__dirname + "/" + link[Math.floor(Math.random() * link.length)])' },
    { file: "utils.js", find: 'await (await axios.get("https://i.ibb.co/wdXBBtc/Banner-Project-Goat-Bot.png", { responseType: "arraybuffer" })).data', replace: 'require("fs").readFileSync(__dirname + "/assets/Banner-Project-Goat-Bot1.png")' },
    { file: "utils.js", find: 'await (await axios.get("https://i.ibb.co/tHtQQRL/Banner-Project-Goat-Bot.png", { responseType: "arraybuffer" })).data', replace: 'require("fs").readFileSync(__dirname + "/assets/Banner-Project-Goat-Bot2.png")' },
    { file: "scripts/cmds/setleave.js", find: 'await getStreamFromURL("https://i.ibb.co/2FKJHJr/guide1.png")', replace: 'fs.createReadStream(__dirname + "/assets/setleave_guide.png")' },
    { file: "scripts/cmds/setname.js", find: 'await getStreamFromURL("https://i.ibb.co/gFh23zb/guide1.png")', replace: 'fs.createReadStream(__dirname + "/assets/setname_guide1.png")' },
    { file: "scripts/cmds/setname.js", find: 'await getStreamFromURL("https://i.ibb.co/BNWHKgj/guide2.png")', replace: 'fs.createReadStream(__dirname + "/assets/setname_guide2.png")' },
    { file: "scripts/cmds/setwelcome.js", find: 'await getStreamFromURL("https://i.ibb.co/vd6bQrW/setwelcome-vi-1.png")', replace: 'fs.createReadStream(__dirname + "/assets/setwelcome_vi.png")' },
    { file: "scripts/cmds/setwelcome.js", find: 'await getStreamFromURL("https://i.ibb.co/vsCz0ks/setwelcome-en-1.png")', replace: 'fs.createReadStream(__dirname + "/assets/setwelcome_en.png")' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/9pou40.mp3', replace: 'assets/9pou40.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/60cwcg.mp3', replace: 'assets/60cwcg.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/epqwbx.mp3', replace: 'assets/epqwbx.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/wc17iq.mp3', replace: 'assets/wc17iq.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/cu0mpy.mp3', replace: 'assets/cu0mpy.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/jl3pzb.mp3', replace: 'assets/jl3pzb.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/z9e52r.mp3', replace: 'assets/z9e52r.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/tdimtx.mp3', replace: 'assets/tdimtx.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/0uii99.mp3', replace: 'assets/0uii99.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'https://files.catbox.moe/p6ht91.mp3', replace: 'assets/p6ht91.mp3' },
    { file: "scripts/cmds/emoji_voice.js", find: 'await global.utils.getStreamFromURL(url)', replace: 'require("fs").createReadStream(__dirname + "/" + url)' }
];

for (const rep of replacements) {
    const fullPath = path.join(__dirname, rep.file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(rep.find, rep.replace);
        fs.writeFileSync(fullPath, content);
    }
}
console.log("Replacements complete.");
