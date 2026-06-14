const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
    { url: "https://i.ibb.co/BZ2Qgs1/image.png", dest: "scripts/cmds/assets/customrankcard_bg1.png" },
    { url: "https://i.ibb.co/wy1ZHHL/image.png", dest: "scripts/cmds/assets/customrankcard_bg2.png" },
    { url: "https://files.catbox.moe/qxovn9.jpg", dest: "scripts/cmds/assets/hug_bg.jpg" },
    { url: "https://files.catbox.moe/6qg782.jpg", dest: "scripts/cmds/assets/kiss_bg.jpg" },
    { url: "https://files.catbox.moe/pxougj.jpg", dest: "scripts/cmds/assets/marry_bg.jpg" },
    { url: "https://files.catbox.moe/29jl5s.jpg", dest: "scripts/cmds/assets/pair_bg.jpg" },
    { url: "https://i.imgur.com/gK9u5iL.png", dest: "scripts/cmds/assets/richest_bg.png" },
    { url: "https://i.ibb.co/B52s0L6G/2a3b08a991cb.jpg", dest: "scripts/cmds/assets/info_bg.jpg" }, // Note: fixed url from i.ibb.co.com to i.ibb.co or it might redirect
    { url: "https://i.ibb.co/9shyYH1/moon-0.png", dest: "scripts/cmds/assets/moon-0.png" },
    { url: "https://i.ibb.co/vBXLL37/moon-1.png", dest: "scripts/cmds/assets/moon-1.png" },
    { url: "https://i.ibb.co/0QCKK9D/moon-2.png", dest: "scripts/cmds/assets/moon-2.png" },
    { url: "https://i.ibb.co/Dp62X2j/moon-3.png", dest: "scripts/cmds/assets/moon-3.png" },
    { url: "https://i.ibb.co/xFKCtfd/moon-4.png", dest: "scripts/cmds/assets/moon-4.png" },
    { url: "https://i.ibb.co/m4L533L/moon-5.png", dest: "scripts/cmds/assets/moon-5.png" },
    { url: "https://i.ibb.co/VmshdMN/moon-6.png", dest: "scripts/cmds/assets/moon-6.png" },
    { url: "https://i.ibb.co/4N7R2B2/moon-7.png", dest: "scripts/cmds/assets/moon-7.png" },
    { url: "https://i.ibb.co/wdXBBtc/Banner-Project-Goat-Bot.png", dest: "assets/Banner-Project-Goat-Bot1.png" },
    { url: "https://i.ibb.co/tHtQQRL/Banner-Project-Goat-Bot.png", dest: "assets/Banner-Project-Goat-Bot2.png" },
    { url: "https://i.ibb.co/2FKJHJr/guide1.png", dest: "scripts/cmds/assets/setleave_guide.png" },
    { url: "https://i.ibb.co/gFh23zb/guide1.png", dest: "scripts/cmds/assets/setname_guide1.png" },
    { url: "https://i.ibb.co/BNWHKgj/guide2.png", dest: "scripts/cmds/assets/setname_guide2.png" },
    { url: "https://i.ibb.co/vd6bQrW/setwelcome-vi-1.png", dest: "scripts/cmds/assets/setwelcome_vi.png" },
    { url: "https://i.ibb.co/vsCz0ks/setwelcome-en-1.png", dest: "scripts/cmds/assets/setwelcome_en.png" },
    { url: "https://files.catbox.moe/9pou40.mp3", dest: "scripts/cmds/assets/9pou40.mp3" },
    { url: "https://files.catbox.moe/60cwcg.mp3", dest: "scripts/cmds/assets/60cwcg.mp3" },
    { url: "https://files.catbox.moe/epqwbx.mp3", dest: "scripts/cmds/assets/epqwbx.mp3" },
    { url: "https://files.catbox.moe/wc17iq.mp3", dest: "scripts/cmds/assets/wc17iq.mp3" },
    { url: "https://files.catbox.moe/cu0mpy.mp3", dest: "scripts/cmds/assets/cu0mpy.mp3" },
    { url: "https://files.catbox.moe/jl3pzb.mp3", dest: "scripts/cmds/assets/jl3pzb.mp3" },
    { url: "https://files.catbox.moe/z9e52r.mp3", dest: "scripts/cmds/assets/z9e52r.mp3" },
    { url: "https://files.catbox.moe/tdimtx.mp3", dest: "scripts/cmds/assets/tdimtx.mp3" },
    { url: "https://files.catbox.moe/0uii99.mp3", dest: "scripts/cmds/assets/0uii99.mp3" },
    { url: "https://files.catbox.moe/p6ht91.mp3", dest: "scripts/cmds/assets/p6ht91.mp3" }
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const file = fs.createWriteStream(dest);
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${url} to ${dest}`);
                    resolve();
                });
            } else if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
                download(response.headers.location, dest).then(resolve).catch(reject);
            } else {
                reject(`Server responded with ${response.statusCode} for ${url}`);
            }
        });
        req.on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err.message);
        });
    });
}

async function run() {
    for (const asset of assets) {
        try {
            await download(asset.url, path.join(__dirname, asset.dest));
        } catch (e) {
            console.error(`Error downloading ${asset.url}: ${e}`);
        }
    }
    console.log("All downloads complete.");
}

run();
