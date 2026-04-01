import os

file_path = r'c:\Users\sanja\OneDrive\Desktop\Documents\PocketCare\app\(tabs)\goals.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update progressSection styling
old_progress_section = '''progressSection: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },'''

new_progress_section = '''progressSection: {
        marginTop: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: `rgba(${isDark ? '255, 215, 0' : '255, 215, 0'}, 0.06)`,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: `rgba(255, 215, 0, 0.3)`,
      },'''

content = content.replace(old_progress_section, new_progress_section)

# Update progressBarContainer styling
old_container = '''progressBarContainer: {
        height: 10,
        backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.1 : 0.05})`,
        borderRadius: 6,
        overflow: 'hidden',
      },'''

new_container = '''progressBarContainer: {
        height: 14,
        backgroundColor: `rgba(${isDark ? '255, 215, 0' : '255, 215, 0'}, 0.08)`,
        borderRadius: 8,
        overflow: 'hidden',
        marginVertical: 10,
        borderWidth: 1,
        borderColor: `rgba(255, 215, 0, 0.15)`,
      },'''

content = content.replace(old_container, new_container)

# Update progressBarFill styling
old_fill = '''progressBarFill: {
        height: '100%',
        backgroundColor: colors.border,
        borderRadius: 6,
      },'''

new_fill = '''progressBarFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 8,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 4,
      },'''

content = content.replace(old_fill, new_fill)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Progress styling successfully updated to match skills page design!")
