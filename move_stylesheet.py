#!/usr/bin/env python3
import re

def move_stylesheet_inside_component(file_path):
    """Move StyleSheet.create definition inside component before return"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the module-level dynamicStyles definition
    stylesheet_start = None
    for i, line in enumerate(lines):
        if re.match(r'^const dynamicStyles = StyleSheet\.create\(\{', line):
            stylesheet_start = i
            break
    
    if stylesheet_start is None:
        print(f"No StyleSheet found in {file_path}")
        return False
    
    # Find the return statement (or just before it for proper insertion)
    return_idx = None
    for i in range(stylesheet_start - 1, -1, -1):
        if re.search(r'return \(', lines[i]):
            return_idx = i
            break
    
    if return_idx is None:
        print(f"No return statement found before StyleSheet in {file_path}")
        return False
    
    # Extract the stylesheet block
    stylesheet_block = []
    brace_count = 0
    stylesheet_end = stylesheet_start
    for i in range(stylesheet_start, len(lines)):
        line = lines[i]
        stylesheet_block.append(line)
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0 and i > stylesheet_start:
            stylesheet_end = i
            break
    
    # Insert 2 blank lines before return, then the stylesheet, then 2 blank lines
    indent = "  "  # 2 spaces for inside component
    stylesheet_indented = [indent + line for line in stylesheet_block]
    
    # Remove last newline from stylesheet if present
    if stylesheet_indented[-1].endswith('\n'):
        stylesheet_indented[-1] = stylesheet_indented[-1].rstrip('\n')
    
    # Insert at return location
    new_lines = (
        lines[:return_idx] +
        ['\n', '\n'] +
        stylesheet_indented +
        ['\n', '\n'] +
        lines[return_idx:]
    )
    
    # Remove the module-level stylesheet
    # Since we inserted, we need to account for the added lines
    offset = len(stylesheet_indented) + 4  # +4 for the blank lines
    new_stylesheet_start = stylesheet_start + offset
    new_stylesheet_end = stylesheet_end + offset + 1
    
    final_lines = new_lines[:new_stylesheet_start] + new_lines[new_stylesheet_end:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
    
    print(f"✓ Moved StyleSheet inside component: {file_path}")
    return True

if __name__ == "__main__":
    files = [
        "app/(tabs)/tasks.tsx",
        "app/(tabs)/placement.tsx",
        "app/(tabs)/schedule.tsx"
    ]
    
    for file_path in files:
        try:
            move_stylesheet_inside_component(file_path)
        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}")
            import traceback
            traceback.print_exc()
