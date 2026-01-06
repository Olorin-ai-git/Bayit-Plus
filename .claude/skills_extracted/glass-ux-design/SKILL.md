---
name: glass-ux-design
description: Glassmorphic dark-mode UI design system using Tailwind CSS. Use this skill when building any UI components, dashboards, applications, or interfaces. Enforces dark mode, glassmorphism effects, animated sidebars, modals, draggable splitters, and custom components. Never use native browser components. Always import the Glass component library.
---

# Glass UX Design System

Build all interfaces with this glassmorphic dark-mode design system. **Always use components from `assets/glass-components.jsx`** as the foundation.

## Core Principles

1. **Dark mode only** - All backgrounds use dark grays/blacks (`bg-gray-900`, `bg-slate-950`, `bg-zinc-900`)
2. **Glassmorphism everywhere** - Frosted glass effects on all containers, cards, modals, sidebars
3. **Tailwind CSS only** - No inline styles, no CSS files, no styled-components
4. **No native components** - Replace all `<select>`, `<input>`, `<button>` with custom Glass variants
5. **Animation required** - All interactive elements must animate (transitions, transforms, opacity)

## Glass Effect Recipe

Apply to all containers, cards, panels:
```jsx
className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
```

Hover states:
```jsx
className="hover:bg-white/10 hover:border-white/20 transition-all duration-300"
```

## Required Components

### GlassSidebar
- Collapsible with smooth width animation
- Semi-transparent with blur
- Icon + text navigation items
- Active state with glow effect

### GlassModal  
- Backdrop blur on overlay
- Scale + fade entrance animation
- Frosted glass container
- Close on backdrop click

### GlassSplitter
- Draggable divider between panels
- Cursor feedback on hover/drag
- Smooth resize with requestAnimationFrame
- Min/max width constraints

### GlassInput / GlassSelect / GlassButton
- Replace ALL native form elements
- Consistent glass styling
- Focus rings with glow
- Smooth transitions

## Implementation Steps

1. Copy components from `assets/glass-components.jsx` into project
2. Import required components
3. Apply dark background to root: `bg-slate-950 min-h-screen`
4. Build layouts using Glass components exclusively

## Animation Tokens

```jsx
// Standard transitions
transition-all duration-300 ease-out

// Hover lift
hover:-translate-y-0.5 hover:shadow-xl

// Scale on press
active:scale-95

// Fade in
animate-[fadeIn_0.3s_ease-out]

// Slide from left (sidebar)
animate-[slideIn_0.3s_ease-out]
```

## Color Palette

| Purpose | Class |
|---------|-------|
| Background | `bg-slate-950` or `bg-gray-900` |
| Glass surface | `bg-white/5` to `bg-white/10` |
| Border | `border-white/10` to `border-white/20` |
| Text primary | `text-white` |
| Text secondary | `text-gray-400` |
| Accent | `text-blue-400` or `text-purple-400` |
| Glow | `shadow-blue-500/20` |

## Example Structure

```jsx
<div className="bg-slate-950 min-h-screen flex">
  <GlassSidebar />
  <GlassSplitter />
  <main className="flex-1 p-6">
    <GlassCard>
      <GlassInput placeholder="Search..." />
      <GlassButton>Submit</GlassButton>
    </GlassCard>
  </main>
  <GlassModal isOpen={open} onClose={() => setOpen(false)}>
    Modal content
  </GlassModal>
</div>
```
