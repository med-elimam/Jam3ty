import colors from '@/constants/colors';
import { useResolvedScheme } from '@/contexts/PreferencesContext';

/**
 * Returns the design tokens for the active color scheme.
 *
 * The scheme is resolved from the user's Appearance preference
 * (system / light / dark) managed by PreferencesContext, falling back
 * to the light palette when a dark palette is not available.
 */
export function useColors() {
  const scheme = useResolvedScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
