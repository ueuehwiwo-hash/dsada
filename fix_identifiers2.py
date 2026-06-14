import os
import re

target_dir = r"c:\Users\abc\Desktop\New folder (9)\ssd"

replacements = [
    (r'\} = RIYAD XD;', r'} = RIYAD_XD;'),
    (r'\} = RIYAD XD\b', r'} = RIYAD_XD'),
    (r'= RIYAD XD;', r'= RIYAD_XD;'),
    (r', RIYAD XD }', r', RIYAD_XD }'),
    (r'\{ RIYAD XD,', r'{ RIYAD_XD,'),
    (r'global\.RIYAD XD\b', r'global.RIYAD_XD')
]

valid_exts = {'.js'}
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
