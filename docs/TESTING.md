# 🧪 Testing Guide

This guide covers testing practices for Kalyanam.

## Testing Stack

| Tool | Purpose |
|------|---------|
| Jest | Test runner |
| React Testing Library | Component testing |
| jest-dom | DOM assertions |

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern="Button"
```

## Test Structure

```
src/
├── __tests__/              # Global tests
├── components/
│   └── ui/
│       └── __tests__/      # Component tests
├── lib/
│   └── __tests__/          # Utility tests
└── hooks/
    └── __tests__/          # Hook tests
```

## Writing Tests

### Component Tests

```typescript
// src/components/ui/__tests__/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByText('Delete')).toHaveClass('bg-destructive');
  });
});
```

### Utility Tests

```typescript
// src/lib/__tests__/utils.test.ts
import { formatCurrency, formatDate, getDaysUntil } from '../utils';

describe('formatCurrency', () => {
  it('formats INR correctly', () => {
    expect(formatCurrency(100000, 'INR')).toBe('₹1,00,000');
  });

  it('formats USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000');
  });
});

describe('formatDate', () => {
  it('formats short date', () => {
    const date = new Date('2024-06-15');
    expect(formatDate(date, 'short')).toMatch(/15.*Jun.*2024/);
  });

  it('returns relative date for today', () => {
    const today = new Date();
    expect(formatDate(today, 'relative')).toBe('Today');
  });
});

describe('getDaysUntil', () => {
  it('calculates days correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    expect(getDaysUntil(futureDate)).toBe(10);
  });
});
```

### Hook Tests

```typescript
// src/hooks/__tests__/use-toast.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../use-toast';

describe('useToast', () => {
  it('adds toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
  });

  it('dismisses toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      const { id } = result.current.toast({ title: 'Test' });
      result.current.dismiss(id);
    });

    // Toast should be marked for removal
    expect(result.current.toasts[0].open).toBe(false);
  });
});
```

### Database Tests

```typescript
// src/lib/db/__tests__/schema.test.ts
import { db, initializeDatabase } from '../schema';

describe('KalyanamDB', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('initializes with default settings', async () => {
    await initializeDatabase();
    const settings = await db.appSettings.get('default');
    
    expect(settings).toBeDefined();
    expect(settings?.theme).toBe('system');
  });

  it('adds and retrieves wedding', async () => {
    const weddingId = 'test-wedding-1';
    
    await db.weddings.add({
      id: weddingId,
      name: 'Test Wedding',
      brideName: 'Bride',
      groomName: 'Groom',
      weddingDate: new Date(),
      cultureId: 'telugu-brahmin',
      status: 'planning',
      budget: 1000000,
      currency: 'INR',
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const wedding = await db.weddings.get(weddingId);
    expect(wedding?.name).toBe('Test Wedding');
  });
});
```

## Testing Patterns

### Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  render(<MyComponent />);
  
  // Wait for loading to complete
  await screen.findByText('Data loaded');
  
  // Or wait for element to disappear
  await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
});
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('handles form submission', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();
  
  render(<MyForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

### Mocking

```typescript
// Mock module
jest.mock('@/lib/db/schema', () => ({
  db: {
    weddings: {
      get: jest.fn().mockResolvedValue({ name: 'Mock Wedding' }),
    },
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
```

## Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | > 70% |
| Branches | > 60% |
| Functions | > 70% |
| Lines | > 70% |

## Test Configuration

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
```

### jest.setup.js

```javascript
import '@testing-library/jest-dom';

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use meaningful test names**
3. **Keep tests isolated**
4. **Don't test library code**
5. **Prefer userEvent over fireEvent**
6. **Clean up after tests**
7. **Use data-testid sparingly**

## Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "test name"

# Debug in VS Code
# Add breakpoint and use "Debug" in test file
```

