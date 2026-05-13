import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --status-ready: #22C55E;
    --status-in-progress: #F59E0B;
    --status-critical: #EF4444;
    --priority-low: #6B7280;
    --priority-normal: #3B82F6;
    --priority-high: #F97316;
    --priority-critical: #DC2626;
    
    --text-primary: ${({ theme }) => theme.colors.textPrimary};
    --text-secondary: ${({ theme }) => theme.colors.textSecondary};
    --text-muted: ${({ theme }) => theme.colors.textMuted};
    --primary: ${({ theme }) => theme.colors.primary};
    --primary-glow: ${({ theme }) => theme.colors.primaryGlow};
    --ready: ${({ theme }) => theme.colors.ready};
    --critical: ${({ theme }) => theme.colors.critical};
    --border: ${({ theme }) => theme.colors.border};
    --bg-secondary: ${({ theme }) => theme.colors.bgSecondary};
    --bg-card: ${({ theme }) => theme.colors.bgCard};
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.textPrimary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
    height: 100dvh;
    transition: background 0.3s ease, color 0.3s ease;
  }

  #root {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.textSecondary};
  }

  /* Glassmorphism utility */
  .glass {
    background: ${({ theme }) => theme.colors.glass};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  }

  /* Global focus-visible — единый стиль для клавиатурной навигации */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Убираем outline при кликах мышью */
  :focus:not(:focus-visible) {
    outline: none;
  }

  /* Respect reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  .hide-mobile {
    @media (max-width: 640px) {
      display: none !important;
    }
  }
`;
