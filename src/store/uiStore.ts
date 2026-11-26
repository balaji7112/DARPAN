import { create } from 'zustand';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  try { return localStorage.getItem('darpan_theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  copilotOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCopilotOpen: (open: boolean) => void;
  toggleTheme: () => void;
}

export const useUI = create<UIState>()((set, get) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  copilotOpen: false,
  theme: readTheme(),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('darpan_theme', theme); } catch { /* storage unavailable */ }
    set({ theme });
  },
}));
