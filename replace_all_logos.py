import os
import shutil

target_dir = r"c:\Users\abc\Desktop\New folder (9)\ssd"
new_logo = r"C:\Users\abc\.gemini\antigravity-ide\brain\dc9dfbd1-1b2d-4837-8800-373e88440d0a\riyad_xd_logo_1781451605401.png"

image_exts = {'.png', '.jpg', '.jpeg'}

count = 0
for root, dirs, files in os.walk(target_dir):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.git' in dirs:
        dirs.remove('.git')
        
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in image_exts:
            full_path = os.path.join(root, file)
            # Copy the new logo over the existing image
            shutil.copy2(new_logo, full_path)
            count += 1
            print(f"Replaced logo at: {full_path}")

print(f"Total logos replaced: {count}")
