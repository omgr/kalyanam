# 👨‍💻 Development Guide

This guide covers development practices for Kalyanam.

## Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI + Custom |
| Database | Dexie.js (IndexedDB) |
| State | React hooks + Zustand |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |

### Key Design Decisions

1. **Local-First Architecture**
   - All data stored in IndexedDB
   - No backend required
   - Works offline

2. **PWA Support**
   - Installable on mobile/desktop
   - Service worker for caching
   - Push notifications (optional)

3. **Cultural Flexibility**
   - Template-based rituals
   - Custom culture support
   - Multi-language ready

## Database Schema

### Core Entities

```typescript
// Wedding - Main entity
interface Wedding {
  id: string;
  name: string;
  brideName: string;
  groomName: string;
  weddingDate: Date;
  cultureId: string;
  budget: number;
  status: 'planning' | 'ongoing' | 'completed';
}

// FamilyMember - Collaborators
interface FamilyMember {
  id: string;
  weddingId: string;
  name: string;
  role: 'primary' | 'secondary' | 'helper';
  side: 'bride' | 'groom' | 'mutual';
  canEdit: boolean;
  canViewBudget: boolean;
}

// WeddingEvent - Ceremonies/Events
interface WeddingEvent {
  id: string;
  weddingId: string;
  name: string;
  localName?: string;
  date: Date;
  category: 'pre-wedding' | 'wedding-day' | 'post-wedding';
  checklist?: ChecklistItem[];
}

// Guest - Invitees
interface Guest {
  id: string;
  weddingId: string;
  name: string;
  side: 'bride' | 'groom' | 'mutual';
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  plusOnes: number;
}
```

See `src/lib/db/schema.ts` for complete schema.

### Using Database Hooks

```typescript
import { useWedding, useEvents, useGuests } from '@/lib/db/hooks';

function MyComponent() {
  const wedding = useWedding(weddingId);
  const events = useEvents(weddingId);
  const guests = useGuests(weddingId);
  
  // Data is reactive - updates automatically
}
```

### Direct Database Operations

```typescript
import { db } from '@/lib/db/schema';

// Create
await db.guests.add({
  id: generateId(),
  weddingId,
  name: 'John Doe',
  // ...
});

// Read
const guest = await db.guests.get(guestId);

// Update
await db.guests.update(guestId, { rsvpStatus: 'confirmed' });

// Delete
await db.guests.delete(guestId);
```

## Adding New Cultural Templates

### 1. Create Culture File

```typescript
// src/lib/cultures/my-culture.ts
import type { Culture, Ritual } from "../db/schema";
import { v4 as uuid } from "uuid";

export const myCultureRituals: Ritual[] = [
  {
    id: uuid(),
    name: "Ritual Name",
    localName: "Local Script Name",
    description: "Description of the ritual",
    significance: "Why this ritual is important",
    typicalDuration: 60, // minutes
    typicalDay: -1, // days relative to wedding (negative = before)
    requiredItems: ["Item 1", "Item 2"],
    participants: ["Bride", "Groom", "Priest"],
    order: 1,
    isOptional: false,
    category: "pre-wedding",
  },
  // ... more rituals
];

export const myCulture: Culture = {
  id: "my-culture",
  name: "My Culture Name",
  region: "Region/Country",
  religion: "Religion",
  description: "Brief description",
  isCustom: false,
  rituals: myCultureRituals,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### 2. Register in Index

```typescript
// src/lib/cultures/index.ts
import { myCulture } from "./my-culture";

export const allCultures: Culture[] = [
  // ... existing cultures
  myCulture,
];
```

## Component Development

### UI Components Location
- Reusable: `src/components/ui/`
- Feature-specific: `src/components/[feature]/`

### Component Pattern

```typescript
// src/components/ui/my-component.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary";
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "base-styles",
          variant === "secondary" && "secondary-styles",
          className
        )}
        {...props}
      />
    );
  }
);
MyComponent.displayName = "MyComponent";

export { MyComponent };
```

## Styling Guidelines

### Tailwind CSS

- Use utility classes
- Leverage CSS variables for theming
- Follow mobile-first approach

```tsx
<div className="
  p-4 
  rounded-lg 
  bg-card 
  text-card-foreground
  hover:shadow-lg 
  transition-all
  md:p-6
  lg:p-8
">
```

### Theme Colors

```css
/* Available CSS variables */
--primary
--secondary
--accent
--background
--foreground
--muted
--destructive
--border
--input
--ring
```

### Wedding-Specific Colors

```css
/* Saffron - Primary wedding color */
--saffron-500: #ffc107

/* Maroon - Traditional */
--maroon-600: #d81b60

/* Gold - Auspicious */
--gold-500: #ffeb3b
```

## Best Practices

### 1. Type Safety
- Always use TypeScript
- Define interfaces for all data structures
- Avoid `any` type

### 2. Performance
- Use `useMemo` and `useCallback` appropriately
- Lazy load components when possible
- Optimize images

### 3. Accessibility
- Use semantic HTML
- Include ARIA labels
- Test with keyboard navigation

### 4. Error Handling
```typescript
try {
  await db.guests.add(guest);
  toast({ title: "Guest added!" });
} catch (error) {
  console.error(error);
  toast({ 
    title: "Error", 
    description: "Failed to add guest",
    variant: "destructive" 
  });
}
```

## Testing

### Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Writing Tests

```typescript
// __tests__/example.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Debugging

### Browser DevTools

1. **React DevTools**: Inspect component tree
2. **IndexedDB**: Application → Storage → IndexedDB
3. **Service Worker**: Application → Service Workers

### Debug Mode

Add to browser console:
```javascript
localStorage.setItem('debug', 'kalyanam:*');
```

