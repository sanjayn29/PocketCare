#!/usr/bin/env python3
import re
import sys

def migrate_file(file_path):
    """Migrate all hardcoded colors to theme colors"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Background colors
    content = re.sub(r"backgroundColor: '#F8FAFC'", "backgroundColor: colors.background", content)
    content = re.sub(r"backgroundColor: '#F1F5F9'", "backgroundColor: colors.background", content)
    content = re.sub(r"backgroundColor: '#FFFFFF'", "backgroundColor: colors.card", content)
    content = re.sub(r"backgroundColor: '#FFF'", "backgroundColor: colors.card", content)
    content = re.sub(r"backgroundColor: '#EFF6FF'", "backgroundColor: colors.background", content)
    content = re.sub(r"backgroundColor: '#ECFDF5'", "backgroundColor: colors.background", content)

    # Text colors
    content = re.sub(r"color: '#0F172A'", "color: colors.text", content)
    content = re.sub(r"color: '#1E293B'", "color: colors.text", content)
    content = re.sub(r"color: '#334155'", "color: colors.text", content)
    content = re.sub(r"color: '#64748B'", "color: colors.textSecondary", content)
    content = re.sub(r"color: '#475569'", "color: colors.textSecondary", content)
    content = re.sub(r"color: '#94A3B8'", "color: colors.textSecondary", content)
    content = re.sub(r"color: '#1E40AF'", "color: colors.primary", content)

    # Special text colors for danger
    content = re.sub(r"color: '#B91C1C'", "color: colors.card", content)
    content = re.sub(r"color: '#065F46'", "color: colors.success", content)

    # Border colors
    content = re.sub(r"borderColor: '#E2E8F0'", "borderColor: colors.border", content)
    content = re.sub(r"borderColor: '#F1F5F9'", "borderColor: colors.border", content)
    content = re.sub(r"borderColor: '#CBD5E1'", "borderColor: colors.border", content)
    content = re.sub(r"borderColor: '#BFDBFE'", "borderColor: colors.border", content)
    content = re.sub(r"borderColor: '#A7F3D0'", "borderColor: colors.border", content)
    content = re.sub(r"borderColor: '#E5E7EB'", "borderColor: colors.border", content)

    # Primary colors
    content = re.sub(r"backgroundColor: '#1D4ED8'", "backgroundColor: colors.primary", content)
    content = re.sub(r"backgroundColor: '#3B82F6'", "backgroundColor: colors.primary", content)
    content = re.sub(r"backgroundColor: '#2563EB'", "backgroundColor: colors.primary", content)
    content = re.sub(r"borderColor: '#1D4ED8'", "borderColor: colors.primary", content)
    content = re.sub(r"borderColor: '#3B82F6'", "borderColor: colors.primary", content)
    content = re.sub(r"borderColor: '#2563EB'", "borderColor: colors.primary", content)
    content = re.sub(r"color: '#1D4ED8'", "color: colors.primary", content)
    content = re.sub(r"color: '#3B82F6'", "color: colors.primary", content)
    content = re.sub(r"color: '#2563EB'", "color: colors.primary", content)
    content = re.sub(r"shadowColor: '#1D4ED8'", "shadowColor: colors.primary", content)
    content = re.sub(r"shadowColor: '#3B82F6'", "shadowColor: colors.primary", content)

    # Danger/Red colors
    content = re.sub(r"backgroundColor: '#FEE2E2'", "backgroundColor: colors.danger", content)
    content = re.sub(r"backgroundColor: '#EF4444'", "backgroundColor: colors.danger", content)
    content = re.sub(r"backgroundColor: '#FF5252'", "backgroundColor: colors.danger", content)
    content = re.sub(r"backgroundColor: '#DC2626'", "backgroundColor: colors.danger", content)
    content = re.sub(r"borderColor: '#FECACA'", "borderColor: colors.danger", content)
    content = re.sub(r"borderColor: '#EF4444'", "borderColor: colors.danger", content)
    content = re.sub(r"borderColor: '#FF5252'", "borderColor: colors.danger", content)
    content = re.sub(r"borderColor: '#DC2626'", "borderColor: colors.danger", content)

    # Success/Green colors
    content = re.sub(r"backgroundColor: '#10B981'", "backgroundColor: colors.success", content)
    content = re.sub(r"backgroundColor: '#22C55E'", "backgroundColor: colors.success", content)
    content = re.sub(r"backgroundColor: '#059669'", "backgroundColor: colors.success", content)
    content = re.sub(r"borderColor: '#10B981'", "borderColor: colors.success", content)
    content = re.sub(r"borderColor: '#22C55E'", "borderColor: colors.success", content)
    content = re.sub(r"borderColor: '#059669'", "borderColor: colors.success", content)
    content = re.sub(r"color: '#10B981'", "color: colors.success", content)
    content = re.sub(r"color: '#22C55E'", "color: colors.success", content)

    # Secondary/Amber colors
    content = re.sub(r"backgroundColor: '#F59E0B'", "backgroundColor: colors.secondary", content)
    content = re.sub(r"backgroundColor: '#D97706'", "backgroundColor: colors.secondary", content)
    content = re.sub(r"backgroundColor: '#ffa500'", "backgroundColor: colors.secondary", content)
    content = re.sub(r"borderColor: '#F59E0B'", "borderColor: colors.secondary", content)
    content = re.sub(r"borderColor: '#D97706'", "borderColor: colors.secondary", content)
    content = re.sub(r"color: '#F59E0B'", "color: colors.secondary", content)
    content = re.sub(r"color: '#D97706'", "color: colors.secondary", content)

    # Now replace all style={styles. with style={dynamicStyles.
    content = re.sub(r"style=\{\[?styles\.", "style={[dynamicStyles.", content)
    content = re.sub(r"style=\{dynamicStyles\.\[", "style={[dynamicStyles.", content)
    content = re.sub(r"\[dynamicStyles\.", "[dynamicStyles.", content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return True

if __name__ == "__main__":
    files = [
        "app/(tabs)/tasks.tsx",
        "app/(tabs)/placement.tsx",
        "app/(tabs)/schedule.tsx"
    ]
    
    for file_path in files:
        try:
            if migrate_file(file_path):
                print(f"✓ {file_path}")
        except Exception as e:
            print(f"✗ {file_path}: {e}")
