// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar, SidebarProvider, useSidebar } from './sidebar';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
// Simulate a Sheet that retains its content while a closing animation is pending.
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
  SheetContent: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'sheet-content' }, children),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let cleanup = () => {};
afterEach(() => cleanup());

it('unmounts mobile sheet content immediately when closing and allows reopening', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  cleanup = () => { act(() => root.unmount()); host.remove(); };
  function Toggle() {
    const { toggleSidebar } = useSidebar();
    return createElement('button', { onClick: toggleSidebar }, 'toggle');
  }
  act(() => root.render(createElement(SidebarProvider, null,
    createElement(Toggle), createElement(Sidebar, null, 'navigation'))));
  const button = host.querySelector('button')!;
  expect(host.querySelector('[data-testid="sheet-content"]')).toBeNull();
  act(() => button.click());
  expect(host.querySelector('[data-testid="sheet-content"]')).not.toBeNull();
  act(() => button.click());
  expect(host.querySelector('[data-testid="sheet-content"]')).toBeNull();
  act(() => button.click());
  expect(host.querySelector('[data-testid="sheet-content"]')).not.toBeNull();
});
