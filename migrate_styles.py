#!/usr/bin/env python3
"""Migrate remaining files to use dynamicStyles with theme colors."""

import re
import os

def migrate_file(filepath, color_replacements):
    """Migrate a single file from module-level styles to component-level dynamicStyles."""
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find where const styles = StyleSheet.create begins
    styles_patterns = [
        r'\n\/\/ ─── Styles ─+\n\nconst styles = StyleSheet\.create\(\{',
        r'\nconst styles = StyleSheet\.create\(\{',
    ]
    
    styles_match = None
    for pattern in styles_patterns:
        styles_match = re.search(pattern, content)
        if styles_match:
            break
    
    if not styles_match:
        print(f"✗ {os.path.basename(filepath)}: Could not find old styles definition")
        return False
    
    styles_start = styles_match.start()
    
    # Find the end of StyleSheet.create by counting braces
    paren_start = content.find('StyleSheet.create(', styles_start)
    brace_count = 1
    search_pos = paren_start + len('StyleSheet.create(')
    
    while search_pos < len(content) and brace_count > 0:
        if content[search_pos] == '{':
            brace_count += 1
        elif content[search_pos] == '}':
            brace_count -= 1
        search_pos += 1
    
    styles_end = search_pos
    old_styles_text = content[styles_start:styles_end]
    
    # Convert to dynamicStyles and replace colors
    new_styles_text = old_styles_text.replace('const styles', 'const dynamicStyles')
    new_styles_text = new_styles_text.replace('// ─── Styles ───────────────────────────────────────────────────────────────────\n\n', '')
    
    for old_color, new_color in color_replacements.items():
        new_styles_text = new_styles_text.replace(f"'{old_color}'", f"{new_color}")
        new_styles_text = new_styles_text.replace(f'"{old_color}"', f"{new_color}")
    
    # Find where to insert dynamicStyles (just before return)
    ret_match = re.search(r'\n\n  return \(', content)
    if not ret_match:
        ret_match = re.search(r'\n  return \(', content)
    
    if not ret_match:
        print(f"✗ {os.path.basename(filepath)}: Could not find return statement")
        return False
    
    original_return_pos = ret_match.start()
    
    # Remove the old styles from the end
    before_styles = content[:styles_start]
    after_styles = content[styles_end:]
    
    # Find return position in the modified content
    modified = before_styles + after_styles
    ret_match2 = re.search(r'\n\n  return \(', modified)
    if not ret_match2:
        ret_match2 = re.search(r'\n  return \(', modified)
    
    if not ret_match2:
        print(f"✗ {os.path.basename(filepath)}: Could not find return after removing styles")
        return False
    
    insert_pos = ret_match2.start()
    new_content = modified[:insert_pos] + '\n\n  ' + new_styles_text + modified[insert_pos:]
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✓ {os.path.basename(filepath)} migrated successfully")
    return True

# Color replacements
color_map = {
    '#E2E8F0': 'colors.border',
    '#F1F5F9': 'colors.border',
    '#3B82F6': 'colors.primary',
    '#1D4ED8': 'colors.primary',
}

# List of filestomigrate
files_to_migrate = [
    'app/(tabs)/schedule.tsx',
]

os.chdir('c:\\Users\\sanja\\OneDrive\\Desktop\\Documents\\PocketCare')

for filepath in files_to_migrate:
    migrate_file(filepath, color_map)

print("\n✓ Migration complete!")
