const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
    {
        url: "https://raw.githubusercontent.com/sheikhtamimlover/ST-Handlers/refs/heads/main/ststartedversion.txt",
        dest: path.join(__dirname, 'bot/login/assets/ststartedversion.txt')
    },
    {
        url: "https://raw.githubusercontent.com/sheikhtamimlover/ST-Handlers/refs/heads/main/stuptimer.html",
        dest: path.join(__dirname, 'bot/login/assets/stuptimer.html')
    },
    {
        url: "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json",
        dest: path.join(__dirname, 'scripts/cmds/assets/baseApiUrl.json')
    },
    {
        url: "https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json",
        dest: path.join(__dirname, 'scripts/cmds/assets/apiUrls.json')
    },
    {
        url: "https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json",
        dest: path.join(__dirname, 'scripts/cmds/assets/UllashApi.json')
    },
    {
        url: "https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/scripts/cmds/assets/hubble/nasa.json",
        dest: path.join(__dirname, 'scripts/cmds/assets/hubble/nasa.json')
    }
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${url} to ${dest}`);
                    resolve();
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // handle redirect
                download(response.headers.location, dest).then(resolve).catch(reject);
            } else {
                reject(`Server responded with ${response.statusCode} for ${url}`);
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err.message);
        });
    });
}

async function run() {
    for (const asset of assets) {
        try {
            await download(asset.url, asset.dest);
        } catch (e) {
            console.error(`Error downloading ${asset.url}: ${e}`);
        }
    }
    console.log("All downloads complete.");
}

run();
