/**
 * KCx Theme Engine - Palette Object
 * Phase 1: Design Token Foundation
 *
 * Re-exports the KCxPalette for direct programmatic access.
 * Used by components, utilities, and runtime styling systems.
 */

import { KCxPalette, type KCxColorToken, type KCxPaletteRegistry } from './kcxThemeTypes';

/**
 * Direct export of the KCx palette.
 * Safe for use in component props, styling helpers, and token generators.
 */
export { KCxPalette, type KCxColorToken, type KCxPaletteRegistry } from './kcxThemeTypes';

export default KCxPalette;
