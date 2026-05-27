/**
 * KCx Theme Engine - Type Definitions
 * Phase 1: Design Token Foundation
 *
 * Provides typed palette registry and token definitions for the KCx ecosystem.
 * Single source of truth for all color values—no framework dependencies.
 */

/**
 * Union type of all valid KCx color tokens.
 * Used for type-safe token references throughout the app.
 */
export type KCxColorToken =
  | 'KCxNonPulse'
  | 'KCxCyanGrid'
  | 'KCxDataStream'
  | 'KCxCodeBleed'
  | 'KCxSolarFlare'
  | 'KCxWhiteLight'
  | 'KCxAbyss'
  | 'KCxObsidianGrid'
  | 'KCxBioPulse'
  | 'KCxQuantumViolet'
  | 'KCxSystemGlitch'
  | 'KCxDeepBronze'
  | 'KCxDataLink'
  | 'KCxBlackAnvilMetal'
  | 'KCxDarkForgeCharcoal'
  | 'KCxEmberAshGray'
  | 'KCxSteelSmoke'
  | 'KCxMoltenEmberOrange'
  | 'KCxForgefireOrange'
  | 'KCxLavaCoreRed'
  | 'KCxHeatedSteelGlow'
  | 'KCxDeepRuntimeBlack'
  | 'KCxTacticalCharcoal'
  | 'KCxDarkChrome'
  | 'KCxRuntimeSteel'
  | 'KCxMagentaCore'
  | 'KCxNeonMagenta'
  | 'KCxCyanPulse'
  | 'KCxElectricCyan'
  | 'KCxReactorPurple'
  | 'KCxGuardianCyan'
  | 'KCxAdaptiveBlue'
  | 'KCxCalmGlass'
  | 'KCxPrivacyBlue'
  | 'KCxMemoryCyan'
  | 'KCxCompanionGlow'
  | 'KCxPixarOrange'
  | 'KCxSoftReactorBlue'
  | 'KCxCortexCoreCyan'
  | 'KCxContainmentBlue'
  | 'KCxIntelligenceViolet'
  | 'KCxReactorContainment'
  | 'KCxWarningAmber'
  | 'KCxNeutralSteel'
  | 'KCxShadowCarbon';

/**
 * Registry type: maps token names to their hex/rgba color values.
 * Enforces that every token in KCxColorToken has a corresponding color.
 */
export type KCxPaletteRegistry = Record<KCxColorToken, string>;

/**
 * The KCx color palette.
 * Single source of truth for all design tokens in the ecosystem.
 */
export const KCxPalette: KCxPaletteRegistry = {
  // Cyan & Electric Primary
  KCxNonPulse: '#7DFDFE',
  KCxCyanGrid: '#18CAE6',
  KCxDataStream: '#0B718A',
  KCxCodeBleed: '#FF410D',
  KCxSolarFlare: '#F4AF2D',

  // Neutral & Light
  KCxWhiteLight: '#FFFFFE',
  KCxAbyss: '#090D10',
  KCxObsidianGrid: '#193F4A',

  // Bio & Neon
  KCxBioPulse: '#00FF66',
  KCxQuantumViolet: '#A500FF',
  KCxSystemGlitch: '#E1F02A',

  // Deep Tones
  KCxDeepBronze: '#4A3B2C',
  KCxDataLink: '#7A8B99',
  KCxBlackAnvilMetal: '#0F1115',
  KCxDarkForgeCharcoal: '#1A1D24',
  KCxEmberAshGray: '#2A2F38',
  KCxSteelSmoke: '#3A404C',

  // Molten Orange & Fire
  KCxMoltenEmberOrange: '#FF7A1A',
  KCxForgefireOrange: '#FF9A3C',
  KCxLavaCoreRed: '#D9472B',
  KCxHeatedSteelGlow: 'rgba(255, 122, 26, 0.18)',

  // Deep Runtime Blacks
  KCxDeepRuntimeBlack: '#090B10',
  KCxTacticalCharcoal: '#141922',
  KCxDarkChrome: '#1E2530',
  KCxRuntimeSteel: '#2B3442',

  // Magenta Core
  KCxMagentaCore: '#FF2D9A',
  KCxNeonMagenta: '#FF4DB2',

  // Cyan Electric
  KCxCyanPulse: '#3BE7FF',
  KCxElectricCyan: '#7AF2FF',

  // Purple & Violet
  KCxReactorPurple: '#8A5CFF',
  KCxGuardianCyan: '#5FE3FF',
  KCxAdaptiveBlue: '#4DA3FF',

  // Glass & Transparency
  KCxCalmGlass: 'rgba(255, 255, 255, 0.06)',

  // Privacy & Memory
  KCxPrivacyBlue: '#3A8DFF',
  KCxMemoryCyan: '#63D9FF',

  // Companion & Warm
  KCxCompanionGlow: '#FFD36A',
  KCxPixarOrange: '#FFB347',

  // Reactor & System
  KCxSoftReactorBlue: '#5CC8FF',
  KCxCortexCoreCyan: '#59F3FF',
  KCxContainmentBlue: '#1B6B8A',
  KCxIntelligenceViolet: '#7C4DFF',
  KCxReactorContainment: '#12161D',

  // Warning & Steel
  KCxWarningAmber: '#FFB000',
  KCxNeutralSteel: '#6E7684',
  KCxShadowCarbon: '#05070A',
};

/**
 * Get a color token by name.
 * Returns the hex or rgba value, or undefined if token doesn't exist.
 *
 * @example
 * const cyan = getKCxToken('KCxNonPulse'); // '#7DFDFE'
 */
export function getKCxToken(token: KCxColorToken): string {
  return KCxPalette[token];
}

/**
 * Get all palette tokens as a readonly record.
 * Useful for iteration or mapping over the full palette.
 */
export function getAllKCxTokens(): Readonly<KCxPaletteRegistry> {
  return Object.freeze({ ...KCxPalette });
}

/**
 * Validate that a string is a valid KCx color token.
 * Used for runtime checks when token names come from external sources.
 *
 * @example
 * if (isValidKCxToken('KCxNonPulse')) { ... }
 */
export function isValidKCxToken(value: unknown): value is KCxColorToken {
  return typeof value === 'string' && value in KCxPalette;
}
