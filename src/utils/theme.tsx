import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';

export const theme = {
  colors: {
    background: '#05060A',
    surface: '#0F172A',
    primary: '#4CAF50',
    accent: '#FFD54F',
    text: '#F8FAFC',
    muted: '#94A3B8'
  },
  typography: {
    title: 'Space Grotesk',
    body: 'Inter'
  }
};

const ThemeContext = createContext(theme);

export function ThemeProvider({ children }: PropsWithChildren<ReactNode>) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
