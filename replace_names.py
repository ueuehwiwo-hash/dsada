import os
import re

target_dir = r"c:\Users\abc\Desktop\New folder (9)\ssd"

replacements = {
    r'(?i)Sheikh\s*Tamim': 'RIYAD XD',
    r'(?i)sheikh\.tamim': 'riyadxd',
    r'(?i)sheikh_tamim': 'riyadxd',
    r'(?i)sheikhtamim': 'riyadxd',
    r'(?i)ST\s*[-|]?\s*BOT': 'RIYAD XD',
    r'(?i)ST\s*Bot': 'RIYAD XD',
    r'(?i)tamimai': 'riyadai',
    r'(?i)stagent': 'riyadagent',
    r'(?i)Rakib\s*Adil': 'RIYAD XD',
    r'(?i)NTKhang': 'RIYAD XD',
    r'(?i)Project\s*Goat\s*Bot': 'Project RIYAD XD',
    r'(?i)Goat[- ]?Bot': 'RIYAD XD',
}

valid_exts = {'.js', '.json', '.html', '.md', '.txt', '.eta'}
ignored_dirs = {'node_modules', '.git', 'backups', '.cache'}

count = 0
for root, dirs, files in os.walk(target_dir):
    dirs[:] = [d for d in dirs if d not in ignored_dirs]
        
    for file in files:
        if file == 'rebrand.js' or file == 'replace_all_logos.py' or file == 'replace_names.py':
            continue
            
        ext = os.path.splitext(file)[1].lower()
        if ext in valid_exts:
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                for pattern, repl in replacements.items():
                    content = re.sub(pattern, repl, content)
                
                if content != original:
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
                    print(f"Updated text in: {full_path}")
            except Exception as e:
                pass # skip files that can't be read as utf-8

print(f"Total files updated: {count}")
