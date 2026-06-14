const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
const outputReport = path.join(__dirname, 'scan_report.txt');

const ignoreDirs = ['node_modules', '.git', 'dashboard/uploads', 'database', 'backups', '.cache'];
const myUid = '61575545431854';

// Regex patterns
const patterns = {
    uid: /\b(?:1000\d{11}|615\d{12})\b/g,
    url: /https?:\/\/[^\s"'`<>]+/g,
    obfuscation: /(_0x[a-f0-9]{4,}|eval\(|String\.fromCharCode|Buffer\.from\([^)]+['"]base64['"]\))/g,
    data_leaks: /(axios\.|request\.|fetch\(|https?\.request)/g
};

let report = "=== DEEP SECURITY SCAN REPORT ===\n\n";
const knownCleanUrls = [
    'https://m.facebook.com', 'https://api.facebook.com', 'https://graph.facebook.com', 
    'https://github.com/sheikhtamimlover', 'https://openrouter.ai'
];

function isCleanUrl(url) {
    return knownCleanUrls.some(clean => url.startsWith(clean)) || url.includes('localhost') || url.includes('127.0.0.1');
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                scanDir(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
            if (file === 'analyze.js' || file === 'scan_report.txt' || file === 'package-lock.json') continue;
            
            const content = fs.readFileSync(fullPath, 'utf8');
            let fileFindings = [];

            // Check UIDs
            let uids = content.match(patterns.uid);
            if (uids) {
                uids = [...new Set(uids)].filter(uid => uid !== myUid);
                if (uids.length > 0) {
                    fileFindings.push(`  [!] Suspicious UIDs found: ${uids.join(', ')}`);
                }
            }

            // Check Obfuscation
            let obf = content.match(patterns.obfuscation);
            if (obf) {
                obf = [...new Set(obf)];
                fileFindings.push(`  [!] Obfuscation/Eval detected: ${obf.slice(0, 5).join(', ')}`);
            }

            // Check Data Leaks
            let leaks = content.match(patterns.data_leaks);
            if (leaks) {
                fileFindings.push(`  [!] Potential external requests: ${[...new Set(leaks)].join(', ')}`);
            }

            // Check URLs
            let urls = content.match(patterns.url);
            if (urls) {
                let suspiciousUrls = [...new Set(urls)].filter(url => !isCleanUrl(url));
                if (suspiciousUrls.length > 0) {
                    fileFindings.push(`  [?] External Links: \n      - ${suspiciousUrls.slice(0, 10).join('\n      - ')}`);
                }
            }

            if (fileFindings.length > 0) {
                report += `File: ${fullPath.replace(targetDir, '')}\n`;
                report += fileFindings.join('\n') + '\n\n';
            }
        }
    }
}

scanDir(targetDir);

fs.writeFileSync(outputReport, report);
console.log("Scan complete. Report saved to scan_report.txt");
