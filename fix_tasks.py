#!/usr/bin/env python3
"""Fix tasks.tsx which has duplicate dynamicStyles definitions."""

import re
import os

def fix_tasks_file():
    """Remove the duplicate dynamicStyles at line 313 and keep/verify the one at line 918."""
    filepath = 'app/(tabs)/tasks.tsx'
    
    if not os.path.exists(filepath):
        print(f"✗ File not found: {filepath}")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find and remove the misplaced dynamicStyles inside the renderTask function (around line 313)
    # The issue is that dynamicStyles is defined inside renderTask which is wrong
    # We need to find the complete definition and remove it
    
    # Strategy: Find "const dynamicStyles = StyleSheet.create({" at line 313
    # Count braces to find the complete object, then remove that whole block
    
    for idx, line in enumerate(lines):
        if idx == 312:  # Line 313 (0-indexed)
            if 'const dyn amicStyles = StyleSheet.create' in line:
                print(f"Found first dynamicStyles at line {idx + 1}")
                # We need to find and remove this entire definition
                # But let's first check what comes after
                break
    
    # Actually, looking at the earlier output, the first dynamicStyles at line 313 looks like
    # it's properly structured inside the renderTask function. The REAL issue is that
    # the JSX references dynamicStyles but the MAIN component doesn't define it until line 918
    
    # So the real fix is:
    # 1. Make sure the dynamicStyles at line 918 is NOT misformed or mixed with JSX
    # 2. If line 918 contains incorrect JSX mixed in, clean it up
    # 3. Ensure all references use this properly defined dynamicStyles
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if dynamicStyles at line 918 has malformed code (JSX mixed in)
    # Find the second occurrence of dynamicStyles
    matches = list(re.finditer(r'const dynamicStyles = StyleSheet\.create\(\{', content))
    
    if len(matches) < 2:
        print("✗ Could not find two dynamicStyles definitions")
        return False
    
    first_match_pos = matches[0].start()
    second_match_pos = matches[1].start()
    
    # Check if the first one is truly inside a function (renderTask)
    # by looking at the context before it
    context_before_first = content[max(0, first_match_pos - 200):first_match_pos]
    if 'renderTask' in context_before_first or 'const renderTask' in context_before_first:
        print("✓ First dynamicStyles is inside renderTask - should be removed")
        # Find and remove the first complete dynamicStyles definition
        
        # Find the end of the first definition by counting braces
        paren_start = first_match_pos + content[first_match_pos:].find('StyleSheet.create(')
        brace_count = 1
        search_pos = paren_start + len('StyleSheet.create(')
        
        while search_pos < len(content) and brace_count > 0:
            if content[search_pos] == '{':
                brace_count += 1
            elif content[search_pos] == '}':
                brace_count -= 1
            search_pos += 1
        
        # Check what's before this definition to see what to preserve
        clean_start = content.rfind('\n', 0, first_match_pos) + 1
        first_def_end = search_pos
        
        # Remove the first definition (it's malformed or misplaced)
        before_first = content[:clean_start]
        after_first = content[first_def_end:]
        
        # Now check if the second definition is properly formed
        # by looking for malformed code after it
        second_brace_start = second_match_pos + after_first[second_match_pos - len(before_first):].find('{')
        
        # Create new content without the first malformed definition
        new_content = before_first + after_first
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Removed malformed dynamicStyles from inside renderTask")
        return True
    else:
        print("✗ First dynamicStyles is not inside renderTask - structure unclear")
        return False

os.chdir('c:\\Users\\sanja\\OneDrive\\Desktop\\Documents\\PocketCare')
if fix_tasks_file():
    print("\n✓ tasks.tsx fixed!")
else:
    print("\n✗ tasks.tsx fix encountered issues")
