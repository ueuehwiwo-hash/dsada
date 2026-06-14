import os
import re

target_dir = r"c:\Users\abc\Desktop\New folder (9)\ssd"

# We want to replace "RIYAD XD" with "RIYAD_XD" only where it's used as a code identifier or property.
# Patterns:
# global.RIYAD XD -> global.RIYAD_XD
# global?.RIYAD XD -> global?.RIYAD_XD
# RIYAD XDApi -> RIYAD_XDApi
# utils.RIYAD XD -> utils.RIYAD_XD
# { RIYAD XD } -> { RIYAD_XD }
# let RIYAD XD = -> let RIYAD_XD =
# global.RIYAD XD. -> global.RIYAD_XD.

replacements = [
    (r'global\.RIYAD XD', r'global.RIYAD_XD'),
    (r'global\?\.RIYAD XD', r'global?.RIYAD_XD'),
    (r'RIYAD XDApi', r'RIYAD_XDApi'),
    (r'RIYAD XD\[', r'RIYAD_XD['),
    (r'RIYAD XD\.', r'RIYAD_XD.'),
    (r'utils\.RIYAD XD', r'utils.RIYAD_XD'),
    (r'\{ RIYAD XD \}', r'{ RIYAD_XD }'),
    (r'const RIYAD XD', r'const RIYAD_XD'),
    (r'let RIYAD XD', r'let RIYAD_XD'),
    (r'var RIYAD XD', r'var RIYAD_XD'),
    (r'RIYAD XD = \{', r'RIYAD_XD = {'),
    (r'RIYAD XD\[prop\]', r'RIYAD_XD[prop]')
]

valid_exts = {'.js', '.json', '.eta'}
ignored_dirs = {'node_modules', '.git'}

count = 0
for root, dirs, files in os.walk(target_dir):
    dirs[:] = [d for d in dirs if d not in ignored_dirs]
        
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in valid_exts:
            full_path = os.path.join(root, file)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                for pattern, repl in replacements:
                    content = re.sub(pattern, repl, content)
                
                if content != original:
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1
            except Exception as e:
                pass

print(f"Fixed identifiers in {count} files")
