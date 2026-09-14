# TaleForge Phase 2 Plan

## Goal

Create the frontend shell and design system foundation without implementing backend-dependent product workflows yet.

## Phase 2 Scope

- Next.js App Router project files.
- TypeScript configuration.
- Tailwind CSS design tokens.
- shadcn-style utility and UI primitives.
- Lucide icon based navigation.
- Responsive application shell.
- Landing page with TaleForge's first visual identity.
- Placeholder pages for the main app routes so future phases have stable navigation targets.

## Not In Scope

- Authentication behavior.
- Story CRUD.
- AI generation.
- Dataset upload.
- Training management.
- Model inference.
- API integration beyond static UI placeholders.

## Visual Shell

```text
/
|
+-- Landing page
|   +-- Hero: "Your Voice. New Stories."
|   +-- Start Writing CTA -> /studio
|   +-- Explore Stories CTA -> /stories
|
+-- App Shell
    |
    +-- /dashboard
    +-- /studio
    +-- /stories
    +-- /dataset
    +-- /training
    +-- /models
    +-- /history
    +-- /evaluation
    +-- /settings

Desktop:
+-----------------------------------------------------+
| Sidebar | Top Bar                                  |
|         +-------------------------------------------|
|         | Route Content                             |
|         | Cards, panels, tables, future workflows   |
+-----------------------------------------------------+

Mobile:
+-----------------------------------------------------+
| Top Bar + menu button                               |
+-----------------------------------------------------+
| Drawer navigation when opened                       |
+-----------------------------------------------------+
| Route Content                                       |
+-----------------------------------------------------+
```

## Design Direction

- Light-first interface with warm neutral surfaces.
- Deep indigo/violet primary accent plus a restrained warm accent.
- Dense enough for a real creative tool, not a marketing-only mockup.
- No dark default, no noisy gradients, no decorative blob backgrounds.
- Cards use modest radius and subtle borders.
- Icons are used for navigation and commands.

## Implementation Steps

1. Add Next.js config, TypeScript config, PostCSS config, and app globals.
2. Add shared utilities and UI primitives.
3. Add navigation data and responsive app shell.
4. Add landing page.
5. Add route placeholders for major TaleForge pages.
6. Install frontend dependencies.
7. Run typecheck and production build.
8. Fix any issues.

## Verification

```powershell
npm install
npm run typecheck
npm run build
```

Phase 2 is complete when the Next.js app builds and the planned routes render from static frontend code.
