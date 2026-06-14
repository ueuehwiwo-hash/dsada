import os
import re
import json

TARGET_DIR = r"C:\Users\abc\Desktop\New folder (9)\ssd"
OUTPUT_FILE = r"C:\Users\abc\Desktop\New folder (9)\ssd\deep_scan_report.txt"

IGNORE_DIRS = {'node_modules', '.git', 'assets', 'backups', '.cache'}
IGNORE_EXTS = {'.png', '.jpg', '.jpeg', '.mp3', '.mp4', '.gif', '.ico', '.svg', '.json'} # Ignore data files for deep script checks, but we should scan js/txt
# Actually, let's scan .json too, but ignore media
VALID_EXTS = {'.js', '.json', '.txt', '.html', '.md'}

# My UID to ignore
SAFE_UID = '61575545431854'

PATTERNS = {
    'UID': re.compile(r'\b(1000\d{11}|615\d{12})\b'),
    'LINK': re.compile(r'https?:\/\/[^\s"\'<>]+'),
    'IP_PROXY': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]{1,5})?\b'),
    'OBFUSCATION': re.compile(r'(_0x[a-f0-9]{4,}|eval\(|String\.fromCharCode|Buffer\.from\([^)]+[\'"]base64[\'"]\))')
}

report = {
    'UIDs': {},
    'LINKS': {},
    'PROXIES': {},
    'OBFUSCATION': {}
}

def scan_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
            # Find UIDs
            uids = set(PATTERNS['UID'].findall(content))
            uids.discard(SAFE_UID)
            if uids:
                report['UIDs'][filepath] = list(uids)
                
            # Find Links
            links = set(PATTERNS['LINK'].findall(content))
            # Ignore standard localhost or schema-only
            links = {l for l in links if not l.startswith('http://localhost') and not l == 'http://' and not l == 'https://'}
            if links:
                report['LINKS'][filepath] = list(links)
                
            # Find Proxies / IPs
            ips = set(PATTERNS['IP_PROXY'].findall(content))
            # Ignore 127.0.0.1
            ips.discard('127.0.0.1')
            if ips:
                report['PROXIES'][filepath] = list(ips)
                
            # Find Obfuscation
            obfs = set(PATTERNS['OBFUSCATION'].findall(content))
            if obfs:
                report['OBFUSCATION'][filepath] = list(obfs)
                
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

def main():
    print(f"Starting deep scan on {TARGET_DIR}...")
    for root, dirs, files in os.walk(TARGET_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in VALID_EXTS:
                filepath = os.path.join(root, file)
                # Skip the analysis scripts themselves
                if file in ['analyze.py', 'analyze.js', 'download_assets.js', 'download_assets_2.js', 'replace_links.js', 'scan_report.txt', 'deep_scan_report.txt']:
                    continue
                scan_file(filepath)
                
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("=== PYTHON DEEP SCAN REPORT ===\n\n")
        for category, findings in report.items():
            f.write(f"[{category} FOUND]\n")
            if not findings:
                f.write("  -> None found.\n\n")
            else:
                for path, items in findings.items():
                    rel_path = os.path.relpath(path, TARGET_DIR)
                    f.write(f"  File: {rel_path}\n")
                    for item in items[:20]: # Limit to 20 per file
                        f.write(f"    - {item}\n")
                    if len(items) > 20:
                        f.write(f"    - ... and {len(items)-20} more\n")
                f.write("\n")
    print(f"Scan complete. Results saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
