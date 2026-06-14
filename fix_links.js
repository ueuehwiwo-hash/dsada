const fs = require('fs');
const path = require('path');

const filePaths = [
    "scripts/cmds/customrankcard.js",
    "scripts/cmds/richest.js",
    "scripts/cmds/moon.js",
    "scripts/cmds/emoji_voice.js",
    "scripts/cmds/setleave.js",
    "scripts/cmds/setname.js",
    "scripts/cmds/setwelcome.js"
];

for(const file of filePaths) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');

    // customrankcard
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/BZ2Qgs1\/image\.png['"]/g, '__dirname + "/assets/customrankcard_bg1.png"');
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/wy1ZHHL\/image\.png['"]/g, '__dirname + "/assets/customrankcard_bg2.png"');

    // richest
    content = content.replace(/['"]https:\/\/i\.imgur\.com\/gK9u5iL\.png['"]/g, '__dirname + "/assets/richest_bg.png"');

    // setleave, setname, setwelcome
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/2FKJHJr\/guide1\.png['"]/g, '__dirname + "/assets/setleave_guide.png"');
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/gFh23zb\/guide1\.png['"]/g, '__dirname + "/assets/setname_guide1.png"');
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/BNWHKgj\/guide2\.png['"]/g, '__dirname + "/assets/setname_guide2.png"');
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/vd6bQrW\/setwelcome-vi-1\.png['"]/g, '__dirname + "/assets/setwelcome_vi.png"');
    content = content.replace(/['"]https:\/\/i\.ibb\.co\/vsCz0ks\/setwelcome-en-1\.png['"]/g, '__dirname + "/assets/setwelcome_en.png"');

    // moon
    if (file.includes("moon.js")) {
        for(let i=0; i<=30; i++){
            // Catch anything ending with /moon-X.png
            content = content.replace(new RegExp(`['"]https:\\/\\/[^'"]+\\/moon-${i}\\.png['"]`, 'g'), `'assets/moon-${i}.png'`);
        }
        content = content.replace(/`https:\/\/lunaf\.com\/img\/moon\/h-phase-\$\{number\}\.png`/g, '`assets/moon-${number}.png`');
    }

    fs.writeFileSync(fullPath, content);
}
console.log("Fixes complete.");
