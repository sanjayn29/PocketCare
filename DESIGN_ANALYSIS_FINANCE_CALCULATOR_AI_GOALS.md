# Design System Analysis: Finance, Calculator, AI & Goals Pages

## Executive Summary
Four premium pages with distinct yet cohesive visual identities, each optimized for their specific domain while maintaining consistent design principles.

---

## 1. COLOR SCHEMES

### Finance Page
**Primary Colors:**
- Overview Tab: Blue (#3B82F6)
- Transactions Tab: Red (#EF4444)
- Debts Tab: Green (#10B981)
- Goals Tab: Amber (#F59E0B)

**Color Palette Usage:**
- Chart colors: Pie/Line/Bar charts use all four colors
- Transaction types: Color-coded by category
- Debt visualization: Green for tracking
- Goal progress: Amber highlighting

### Calculator Page
**Primary Colors:**
- Basic Tab: Blue (#3B82F6)
- Interest Tab: Purple (#8B5CF6)
- History Tab: Green (#10B981)
- Accent: Amber (#F59E0B)

**Color Strategy:**
- Calculator buttons: Primary blue
- Interest results: Purple emphasis
- History items: Green indicators
- Highlights: Amber accents

### AI Page
**Primary Colors:**
- Bright Gold: #FFD700 (primary)
- Soft Gold: #E8C96A (secondary)
- Text: White on dark, Black on light

**Visual Identity:**
- Premium gold theme
- Luxury aesthetic
- High contrast messaging
- Emphasis on elevation and shadows

### Goals Page
**Primary Colors:**
- Health Category: Green (#10B981)
- Finance Category: Amber (#F59E0B)
- Career Category: Purple (#8B5CF6)
- Personal Category: Blue (#3B82F6)
- Primary Filter: Gold (#FFD700)

**Dynamic Colors:**
- Progress Fill: Gold (#FFD700) → Green (#22C55E) when complete
- Back Button: Gold (#FFD700)
- Action Buttons: Gold (edit), Red (delete)

---

## 2. TYPOGRAPHY & FONTS

### Font Families
- **Roboto Slab**: Used across all pages for premium feel
- **Momo Signature**: Used in AI page for special emphasis
- **Default System Font**: Fallback for body text

### Typography Hierarchy

#### Page Titles
- **Size**: 24px
- **Font**: Roboto Slab
- **Weight**: Bold
- **Letter Spacing**: -0.5
- **Color**: Adaptive (white/black)

#### Tab Labels
- **Size**: 11px
- **Weight**: Bold (fontWeight: '700')
- **Color**: Active = category color, Inactive = secondary text
- **Text Transform**: Uppercase (Goals)

#### Card Titles
- **Size**: 18-20px
- **Weight**: 700-900
- **Letter Spacing**: -0.3
- **Color**: Adaptive

#### Body Text
- **Size**: 14-16px
- **Weight**: 400-600
- **Color**: colors.textSecondary or colors.text

#### Small Labels
- **Size**: 11-12px
- **Weight**: 600-700
- **Text Transform**: Uppercase (Goals)
- **Letter Spacing**: 0.3-0.5

---

## 3. COMPONENT STRUCTURE

### Header Design (All Pages)

```
┌─────────────────────────────────┐
│  ← [Back Button]  Page Title    │  ← BlurView container
├─────────────────────────────────┤
│  Tab1  Tab2  Tab3  Tab4         │  ← Tab Navigation
├─────────────────────────────────┤
│                                 │
│  Filter / Controls              │  ← Time/Category filters
│                                 │
└─────────────────────────────────┘
```

#### Back Button
- **Size**: 40x40 px
- **Border Radius**: 20px (circular)
- **Border**: 1.5px, colored by active tab/category
- **Background**: Semi-transparent (rgba based on theme)
- **Icon**: Left arrow (←), 22px
- **Animation**: Scale pulse (1.0 → 1.06, 700ms loop)

#### BlurView Container
- **Intensity**: 40 (dark mode), 60 (light mode)
- **Overflow**: Hidden
- **Position**: Absolute overlay behind header

### Tab Navigation

#### Finance & Calculator
- **Style**: Horizontal scrollable tabs
- **Active Indicator**: 3px bottom border with shadow
- **Padding**: paddingVertical: 10, paddingHorizontal: 4
- **Colors**: Dynamic based on active tab
- **Width**: flex: 1

#### AI Page
- **No traditional tabs**: Uses conversation flow
- **Message-based**: Chat interface

#### Goals Page
- **Removed category tabs** in latest version
- **Uses time filters instead**: All, Month, Year, Custom

### Filter Section

#### Time Filters
- **Options**: All, Day/Week, Month, Year, Custom
- **Style**: Segment buttons in a horizontal row
- **Border**: 1px, normal color for inactive, gold for active
- **Border Radius**: 20px
- **Padding**: 8-12px
- **Background**: Adaptive (transparent → gold when active)
- **Spacing**: 8-10px between buttons

#### Custom Date Picker
- **Component**: DateTimePicker
- **Platform**: Different for iOS/Android
- **Modal**: Overlay with date range selection

---

## 4. CARD LAYOUTS

### Finance Cards
```
┌─────────────────────────────────┐
│ Icon  Title         Amount  ▶   │
│ Description                     │
│ Category Badge  Date            │
└─────────────────────────────────┘
```
- **Border Radius**: 20px
- **Padding**: 16px
- **Shadow**: height: 4, opacity: 0.08-0.12
- **Border**: 1.5px, border color
- **Spacing**: margin-bottom: 16-18px

### Calculator Cards
```
┌─────────────────────────────────┐
│ Title              [Delete]     │
│ Expression/Result               │
│ Date  Category                  │
│ [Interest Details]              │
└─────────────────────────────────┘
```
- Same border radius and shadow as Finance
- More compact spacing
- Color-coded by calculation type

### Goals Cards (Redesigned like Health)
```
┌─────────────────────────────────┐
│ [Priority]  [Category]  [Edit][Delete]
├─────────────────────────────────┤
│ Goal Title                      │
│ Goal Description                │
├─────────────────────────────────┤
│ 📅 Deadline Date               │
├─────────────────────────────────┤
│ Goal Progress:  60%             │
│ ▓▓▓▓▓▓░░░░  (Gold Fill)         │
├─────────────────────────────────┤
│ □ Subtask 1                     │
│ □ Subtask 2                     │
└─────────────────────────────────┘
```

#### Goals Card Header
- **Layout**: Flexbox row
- **Left**: Priority + Category badges
- **Right**: Edit + Delete buttons (stacked vertically)
- **Spacing**: 8px gap

#### Action Buttons (Goals)
- **Size**: 40x40-42px
- **Border Radius**: 8-20px
- **Edit Button**: Gold icon (#FFD700)
- **Delete Button**: Red icon (#EF4444)
- **Background**: Transparent with 0.1 opacity

#### Priority Badge
- **Low**: Green (#10B981) + down arrow
- **Medium**: Amber (#F59E0B) + ellipsis
- **High**: Red (#EF4444) + up arrow
- **Padding**: 8-10px
- **Border Radius**: 8px

### AI Card (Message Bubble)
```
┌─────────────────┐
│ AI Message      │
│                 │
└─────────────────┘

┌─────────────────┐
│ User Message    │
│                 │
└─────────────────┘
```
- **Border Radius**: 16px
- **Padding**: 12-16px
- **Background**: Different colors for user/AI
- **Timestamp**: Small, secondary color

---

## 5. BUTTON STYLING

### Tab Buttons
- **Active**: Category color background + white text
- **Inactive**: Transparent background + secondary text
- **Indicator**: 3px bottom border with shadow
- **Transition**: Smooth color change

### Filter Buttons (Segment Controls)
- **Unselected**: Normal border + transparent background
- **Selected**: Gold border (#FFD700) + gold background (rgba)
- **Text**: White on selected, secondary on unselected
- **Border Radius**: 20px
- **Shadow**: Subtle when active

### Action Buttons (Finance/Calculator)
- **Style**: Icon button, 40x40px
- **Background**: Semi-transparent (rgba)
- **Colors**: Category-specific
- **Hover**: Scale effect or opacity change

### Action Buttons (Goals)
- **Edit**: Gold (#FFD700)
- **Delete**: Red (#EF4444)
- **Layout**: Vertical stack (one above other)
- **Spacing**: 8px gap

### Create/Add Buttons
- **Style**: Floating action or card-based
- **Background**: Gold or primary color
- **Text**: White
- **Icon**: Plus (+) or relevant icon
- **Border Radius**: 20px
- **Shadow**: Medium elevation

---

## 6. INPUT FIELDS

### Text Inputs
- **Border Radius**: 12-14px
- **Border**: 1-1.5px, colors.border
- **Padding**: 12-16px
- **Font Size**: 14-16px
- **Background**: Adaptive (light/dark)
- **Placeholder**: Secondary text color
- **Focus State**: Border color change (gold in Goals)

### Number Inputs
- **Same as text inputs**
- **keyboard**: numeric-pad or decimal-pad
- **Text Align**: right

### Date Inputs
- **Style**: Touchable with DateTimePicker
- **Display**: "YYYY-MM-DD" format
- **Icon**: Calendar (📅)
- **Border**: Same as text inputs

### Dropdown Selectors (Goals)
- **Style**: Button that opens modal menu
- **Options**: Category, Priority, etc.
- **Active**: Gold border highlight
- **Open Indicator**: Chevron (▼)

---

## 7. INPUT FIELD VARIATIONS (Goals)

### Small Input
- **Height**: Auto (multiline)
- **Padding**: 14px
- **Border Radius**: 12px
- **Used For**: Goal titles, descriptions

### Content Input
- **Height**: 110px
- **Padding**: 14px
- **Border Radius**: 14px
- **Multiline**: true
- **Used For**: Detailed content

### Date Input Wrapper
- **Flex**: Row layout
- **Padding**: 12px
- **Border Radius**: 12px
- **Border**: 1px, colors.border

### Subtask Input
- **Padding**: 14px
- **Border Radius**: 12px
- **Icon**: Add (+)
- **Color**: Gold when active

---

## 8. PROGRESS BARS

### Finance Page
- **Display**: Circular progress or percentage
- **Color**: Category-specific
- **Size**: Variable based on context

### Calculator Page
- **Display**: Calculation result emphasis
- **Color**: Purple for interest tab
- **Size**: Large, prominent

### Goals Page (Enhanced)
- **Height**: 14px (larger than others)
- **Background**: Gold with 0.08 opacity (rgba)
- **Fill Color**: Gold (#FFD700) → Green (#22C55E) at 100%
- **Border Radius**: 8px
- **Border**: 1.5px, gold (rgba with 0.3 opacity)
- **Shadow**: Gold glow
  - shadowColor: #FFD700
  - shadowOffset: 0, 2
  - shadowOpacity: 0.35
  - shadowRadius: 5
  - elevation: 4
- **Container Padding**: 12-14px
- **Display**: Percentage text + progress bar

---

## 9. SHADOWS & ELEVATION

### Standard Shadow Pattern
```javascript
shadowColor: colors.border,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.08-0.12,
shadowRadius: 10-12,
elevation: 3-5
```

### Card Shadows
- **Standard**: height: 4, opacity: 0.08
- **Hover/Active**: height: 5, opacity: 0.12
- **Shadow Radius**: 10-14px

### Button Shadows (Goals - Gold)
```javascript
shadowColor: '#FFD700',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.3-0.35,
shadowRadius: 4-5,
elevation: 3-4
```

### Elevation Levels
1. **Minimal**: opacity: 0.05
2. **Subtle**: opacity: 0.08-0.12
3. **Medium**: opacity: 0.15-0.2
4. **Strong**: opacity: 0.25+

---

## 10. DARK/LIGHT MODE

### Theme Colors (Dynamic)
All pages use `getColors(isDark)` which returns:
- `background`: Theme-appropriate background
- `text`: Primary text color
- `textSecondary`: Secondary text color
- `border`: Border color
- `surface`: Card surface color

### Adaptive Color Values
```javascript
// Example pattern:
backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`

// Result:
// Dark mode: Slight white overlay
// Light mode: Slight black overlay
```

### Border Colors
- **Light Mode**: #E5E7EB (light gray)
- **Dark Mode**: #2D2D2D (dark gray)

### Text Colors
- **Light Mode**:
  - Primary: #000000
  - Secondary: #6B7280
- **Dark Mode**:
  - Primary: #FFFFFF
  - Secondary: #9DA3AF

---

## 11. SPACING & LAYOUT

### Consistent Spacing Scale
- **XS**: 4px (minimal gaps)
- **S**: 8px (small gaps between items)
- **M**: 12-14px (standard padding)
- **L**: 16-18px (card padding)
- **XL**: 20px (header padding)
- **XXL**: 24px (major sections)

### Card Spacing
- **Internal Padding**: 16-18px
- **Margin Bottom**: 16-18px
- **Gap Between Elements**: 8-12px

### Header Spacing
- **Horizontal Padding**: 20px
- **Top Padding**: 12px (iOS), 20px (Android)
- **Bottom Padding**: 20px
- **Header Gap**: 16px (between back button and title)

### Section Spacing (Goals)
- **Filter Top Margin**: 24px (gap from header)
- **Filter Bottom Margin**: 16px
- **Content Top Padding**: 8px
- **Content Gap**: 12px

---

## 12. PLATFORM CONSIDERATIONS

### iOS vs Android
- **SafeAreaView**: Different edge handling
- **KeyboardAvoidingView**: Behavior differences
- **DateTimePicker**: Modal vs Spinner
- **Platform-specific padding**: paddingTop varies

### Responsive Design
- **Layout**: Adaptive to screen width
- **Text Size**: Scales appropriately
- **Touch Targets**: Min 40x40px (all buttons)
- **Scrollable Areas**: Full height minus header

---

## 13. VISUAL HIERARCHY

### Finance Page Hierarchy
1. Header (BlurView + Back Button + Title)
2. Tab Navigation (Active indicator)
3. Time Filters (All, Today, Month, etc.)
4. Cards (Transactions, Debts, Goals)
5. Charts (Overview visualization)

### Calculator Page Hierarchy
1. Header
2. Tabs (Basic, Interest, History)
3. Input Fields (Principal, Rate, Time)
4. Result Display (Large emphasis)
5. History List

### AI Page Hierarchy
1. Header (Minimalist)
2. Insight Box (Top)
3. Chat Messages (Scrollable)
4. Input Area (Bottom sticky)

### Goals Page Hierarchy
1. Header (BlurView + Back + Title + 24px gap)
2. Time Filters (All, Month, Year, Custom)
3. Create Goal Card
4. Goal Cards (Badges, Title, Description, Progress, Subtasks)

---

## 14. INTERACTIVE STATES

### Buttons
- **Default**: Normal appearance
- **Pressed**: Opacity change + scale (1.0 → 0.95)
- **Active/Selected**: Color change + border highlight

### Cards
- **Default**: Standard shadow
- **Pressed**: Increased shadow + scale
- **Swipe Actions** (if available): Reveal delete/edit

### Inputs
- **Default**: Normal border color
- **Focused**: Gold border (#FFD700 in Goals)
- **Error**: Red border/background
- **Disabled**: Reduced opacity

### Tabs
- **Inactive**: Secondary text color
- **Active**: Category color with bottom indicator

---

## 15. KEY DIFFERENCES

| Element | Finance | Calculator | AI | Goals |
|---------|---------|-----------|----|----|
| **Primary Color** | Multi-tab (Blue/Red/Green/Amber) | Blue/Purple/Green | Gold (#FFD700) | Gold (#FFD700) |
| **Header** | BlurView + 4 tabs | BlurView + 3 tabs | Minimalist | BlurView + Time filters |
| **Cards** | Transaction/Debt/Goal focused | Calculation history | Chat bubbles | Goals with progress |
| **Progress** | Percentage text | Result display | N/A | Gold fill bar with shadow |
| **Filters** | Time-based | Type + Date | N/A | Time-based + Custom |
| **Charts** | Pie/Line/Bar | N/A | N/A | Progress only |
| **Main CTA** | Add Transaction | Calculate | Send Message | Create Goal |

---

## 16. RECOMMENDED CONSISTENCY IMPROVEMENTS

### High Priority
1. ✅ Standardize border radius: 20px (cards), 12px (inputs), 8px (small)
2. ✅ Use consistent shadow pattern across all pages
3. ✅ Unified typography hierarchy
4. ✅ Consistent spacing scale

### Medium Priority
1. Apply gold theme to Finance/Calculator/Health pages
2. Unify button styling across all pages
3. Standardize card layouts
4. Consistent filter design

### Low Priority
1. Add animations to all interactive elements
2. Enhance transition effects
3. Add micro-interactions for feedback
4. Implement haptic feedback

---

## Summary

All four pages follow a **premium, cohesive design system** with:
- **Professional typography** (Roboto Slab headers)
- **Adaptive dark/light modes**
- **Consistent component patterns**
- **Category-specific color coding**
- **Smooth animations and interactions**
- **Accessible touch targets**
- **Clear visual hierarchy**

The **Goals page** has the most refined design with gold accents, proper spacing, and enhanced progress visualization, making it a strong pattern to reference for other pages.
