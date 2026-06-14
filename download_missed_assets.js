const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
    { url: "https://files.catbox.moe/mu0kka.mp3", dest: "scripts/cmds/assets/mu0kka.mp3" },
    { url: "https://files.catbox.moe/dv9why.mp3", dest: "scripts/cmds/assets/dv9why.mp3" },
    { url: "https://files.catbox.moe/ivlvoq.mp3", dest: "scripts/cmds/assets/ivlvoq.mp3" },
    { url: "https://files.catbox.moe/sbws0w.mp3", dest: "scripts/cmds/assets/sbws0w.mp3" },
    { url: "https://files.catbox.moe/p78xfw.mp3", dest: "scripts/cmds/assets/p78xfw.mp3" },
    { url: "https://files.catbox.moe/shxwj1.mp3", dest: "scripts/cmds/assets/shxwj1.mp3" },
    { url: "https://files.catbox.moe/3bejxv.mp3", dest: "scripts/cmds/assets/3bejxv.mp3" },
    { url: "https://files.catbox.moe/4aci0r.mp3", dest: "scripts/cmds/assets/4aci0r.mp3" },
    { url: "https://files.catbox.moe/3qc90y.mp3", dest: "scripts/cmds/assets/3qc90y.mp3" },
    { url: "https://files.catbox.moe/qjfk1b.mp3", dest: "scripts/cmds/assets/qjfk1b.mp3" },
    { url: "https://files.catbox.moe/itm4g0.mp3", dest: "scripts/cmds/assets/itm4g0.mp3" },
    { url: "https://files.catbox.moe/y8ul2j.mp3", dest: "scripts/cmds/assets/y8ul2j.mp3" },
    { url: "https://files.catbox.moe/tqxemm.mp3", dest: "scripts/cmds/assets/tqxemm.mp3" },
    { url: "https://files.catbox.moe/6yanv3.mp3", dest: "scripts/cmds/assets/6yanv3.mp3" },
    { url: "https://files.catbox.moe/2sweut.mp3", dest: "scripts/cmds/assets/2sweut.mp3" },
    { url: "https://files.catbox.moe/jf85xe.mp3", dest: "scripts/cmds/assets/jf85xe.mp3" },
    { url: "https://files.catbox.moe/b4m5aj.mp3", dest: "scripts/cmds/assets/b4m5aj.mp3" },
    { url: "https://files.catbox.moe/ttb6hi.mp3", dest: "scripts/cmds/assets/ttb6hi.mp3" },
    { url: "https://files.catbox.moe/utl83s.mp3", dest: "scripts/cmds/assets/utl83s.mp3" }
];

for(let i=8; i<=30; i++){
    assets.push({ url: `https://lunaf.com/img/moon/h-phase-${i}.png`, dest: `scripts/cmds/assets/moon-${i}.png` });
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const file = fs.createWriteStream(dest);
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${url}`);
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
