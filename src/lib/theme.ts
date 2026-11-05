import { useColorScheme } from 'react-native';

// Colours taken from the Ibadan City Academy crest: red, gold, green and white.
const light = {
  bg: '#F2F5EE',
  surface: '#FFFFFF',
  sunk: '#E8EDE4',
  ink: '#14201A',
  muted: '#58675D',
  line: '#D7DFD3',
  green: '#1C6A39',
  onGreen: '#FFFFFF',
  greenSoft: '#DFEDE3',
  red: '#AE261E',
  redSoft: '#F7E1DE',
  gold: '#E0AE16',
  goldInk: '#5C4500',
  goldSoft: '#FAEFC8',
  scrim: 'rgba(10,20,14,0.45)',
  dark: false,
};

const dark: typeof light = {
  bg: '#0B140F',
  surface: '#131F18',
  sunk: '#1A2920',
  ink: '#E5EDE7',
  muted: '#95A79B',
  line: '#26392D',
  green: '#5DBF7F',
  onGreen: '#07130B',
  greenSoft: '#16301F',
  red: '#F2857A',
  redSoft: '#381A17',
  gold: '#F0C540',
  goldInk: '#F0C540',
  goldSoft: '#30280B',
  scrim: 'rgba(0,0,0,0.6)',
  dark: true,
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semi: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
} as const;

export const radius = 14;

/** Avatar colours, picked from a member's id so each person keeps one colour. */
const HUES = ['#1C6A39', '#AE261E', '#8A6A00', '#2F5E8C', '#6B3F8C', '#9C4A1A', '#2E7A72', '#7A2E52'];
export function avatarColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}
