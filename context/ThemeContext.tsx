import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme() ?? 'light';
  // null means "follow system"; set to a value when user manually overrides
  const [manualTheme, setManualTheme] = useState<ThemeMode | null>(null);

  // Effective theme: use manual override if set, otherwise follow system
  const theme: ThemeMode = manualTheme ?? (systemScheme as ThemeMode);

  const toggleTheme = () => {
    // Toggle from the current effective theme
    setManualTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

