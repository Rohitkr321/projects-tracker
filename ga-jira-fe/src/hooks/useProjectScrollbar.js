import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Overrides the global CSS scrollbar color with the project color while
 * the calling screen is mounted, then resets to the default on unmount.
 */
export function useProjectScrollbar(projectColor) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !projectColor) return;

    const root = document.documentElement;
    const thumb = projectColor + 'AA'; // ~67% opacity for the resting state
    const thumbHover = projectColor;

    root.style.setProperty('--scrollbar-thumb', thumb);
    root.style.setProperty('--scrollbar-thumb-hover', thumbHover);

    return () => {
      // Reset to global brand default
      root.style.setProperty('--scrollbar-thumb', '#2F6EB780');
      root.style.setProperty('--scrollbar-thumb-hover', '#062B6F');
    };
  }, [projectColor]);
}
