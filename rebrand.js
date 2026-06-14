const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
const logoSource = "C:\\Users\\abc\\.gemini\\antigravity-ide\\brain\\dc9dfbd1-1b2d-4837-8800-373e88440d0a\\riyad_xd_logo_1781451605401.png";

const replacePairs = [
    [/Rakib Adil/g, "RIYAD XD"],
    [/ST \| Sheikh Tamim/g, "RIYAD XD"],
    [/ST \| BOT/g, "RIYAD XD"],
    [/Project Goat Bot/gi, "Project RIYAD XD"],
    [/Goat-Bot/gi, "RIYAD XD"],
    [/Goat Bot/gi, "RIYAD XD"],
    [/NTKhang/g, "RIYAD XD"],
    [/Saim12678/g, "RIYAD XD"],
    [/cyber-ullash/g, "riyad-xd"],
    [/MAHBUB ULLASH/g, "RIYAD XD"],
    [/sheikh\.tamim_lover/g, "riyadxd"],
    [/sheikhtamimlover/g, "riyadxd"]
];

const ignoredDirs = ['node_modules', '.git', 'backups', '.cache'];
const validExts = ['.js', '.json', '.html', '.md', '.txt'];

function replaceInFile(filePath) {
    if (filePath.endsWith('rebrand.js') || filePath.endsWith('analyze.py')) return;
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        for (const [regex, replacement] of replacePairs) {
            content = content.replace(regex, replacement);
        }
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated text in: ${filePath}`);
        }
    } catch (e) {
        console.error(`Error reading ${filePath}: ${e}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoredDirs.includes(file)) {
                processDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            // Delete media
            if (['.mp3', '.png', '.jpg', '.jpeg'].includes(ext)) {
                fs.unlinkSync(fullPath);
                console.log(`Deleted media: ${fullPath}`);
            } 
            // Text replace
            else if (validExts.includes(ext)) {
                replaceInFile(fullPath);
            }
        }
    }
}

// 1. Process deletions and text replacements
processDirectory(targetDir);

// 2. Delete emoji_voice and moon commands
if (fs.existsSync(path.join(__dirname, "scripts", "cmds", "emoji_voice.js"))) {
    fs.unlinkSync(path.join(__dirname, "scripts", "cmds", "emoji_voice.js"));
    console.log("Deleted emoji_voice.js");
}
if (fs.existsSync(path.join(__dirname, "scripts", "cmds", "moon.js"))) {
    fs.unlinkSync(path.join(__dirname, "scripts", "cmds", "moon.js"));
    console.log("Deleted moon.js");
}

// 3. Set up the new logo everywhere it's expected
const assetsDir = path.join(__dirname, "scripts", "cmds", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, {recursive: true});

const requiredLogos = [
    "customrankcard_bg1.png",
    "customrankcard_bg2.png",
    "hug_bg.jpg",
    "kiss_bg.jpg",
    "marry_bg.jpg",
    "pair_bg.jpg",
    "richest_bg.png",
    "info_bg.jpg",
    "setleave_guide.png",
    "setname_guide1.png",
    "setname_guide2.png",
    "setwelcome_en.png",
    "setwelcome_vi.png"
];

for (const name of requiredLogos) {
    fs.copyFileSync(logoSource, path.join(assetsDir, name));
}

// Global utils banners
const globalAssetsDir = path.join(__dirname, "assets");
if (!fs.existsSync(globalAssetsDir)) fs.mkdirSync(globalAssetsDir, {recursive: true});
fs.copyFileSync(logoSource, path.join(globalAssetsDir, "Banner-Project-Goat-Bot1.png"));
fs.copyFileSync(logoSource, path.join(globalAssetsDir, "Banner-Project-Goat-Bot2.png"));

console.log("Rebranding complete.");
