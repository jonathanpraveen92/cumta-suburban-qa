import React, { createContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const ThemeContext = createContext();

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('cumta_theme_mode') || 'light';
  });

  const toggleThemeMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('cumta_theme_mode', newMode);
      return newMode;
    });
  };

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    return createTheme({
      palette: {
        mode,
        primary: {
          main: '#006A4E', // Tamil Nadu Gov Emerald Green
          light: '#338771',
          dark: '#004A36',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#FFB81C', // CUMTA Gold
          light: '#FFC649',
          dark: '#B28013',
          contrastText: '#1C1C1C',
        },
        background: {
          default: isDark ? '#0f172a' : '#f8fafc', // Slate 900 vs Slate 50
          paper: isDark ? '#1e293b' : '#ffffff',   // Slate 800 vs White
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#475569',
        },
        error: {
          main: '#ef4444', // Red 500
        },
        warning: {
          main: '#f59e0b', // Amber 500
        },
        success: {
          main: '#10b981', // Emerald 500
        },
        info: {
          main: '#0ea5e9', // Sky 500
        },
      },
      typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: {
        borderRadius: 12,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0px 4px 10px rgba(0, 106, 78, 0.15)',
              },
            },
            containedSecondary: {
              '&:hover': {
                boxShadow: '0px 4px 10px rgba(255, 184, 28, 0.25)',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              boxShadow: isDark 
                ? '0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2)' 
                : '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleThemeMode, isDark: mode === 'dark' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
