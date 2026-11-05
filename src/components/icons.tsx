import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home' | 'feed' | 'cal' | 'wallet' | 'people' | 'bell' | 'plus' | 'share' | 'chat' | 'cake'
  | 'copy' | 'check' | 'x' | 'pin' | 'clock' | 'heart' | 'trash' | 'left' | 'right' | 'search'
  | 'gift' | 'star' | 'card' | 'bank' | 'user' | 'logout';

/** Line icons drawn on a 24px grid. */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const body = (() => {
    switch (name) {
      case 'home': return <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
      case 'feed': return <><Path {...p} d="M3 10v4h3l6 4V6L6 10H3z" /><Path {...p} d="M16 9a4 4 0 0 1 0 6" /><Path {...p} d="M19 6a8 8 0 0 1 0 12" /></>;
      case 'cal': return <><Rect {...p} x={3} y={5} width={18} height={16} rx={2} /><Path {...p} d="M3 10h18M8 3v4M16 3v4" /></>;
      case 'wallet': return <><Rect {...p} x={3} y={6} width={18} height={14} rx={2} /><Path {...p} d="M3 10h18" /><Circle {...p} cx={16.5} cy={15} r={1.2} /></>;
      case 'people': return <><Circle {...p} cx={9} cy={8} r={3.5} /><Path {...p} d="M2.5 20a6.5 6.5 0 0 1 13 0" /><Circle {...p} cx={17} cy={9} r={2.5} /><Path {...p} d="M16 14.2a5 5 0 0 1 5.5 5.8" /></>;
      case 'bell': return <><Path {...p} d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><Path {...p} d="M10 20a2 2 0 0 0 4 0" /></>;
      case 'plus': return <Path {...p} d="M12 5v14M5 12h14" />;
      case 'share': return <><Circle {...p} cx={18} cy={5} r={2.5} /><Circle {...p} cx={6} cy={12} r={2.5} /><Circle {...p} cx={18} cy={19} r={2.5} /><Path {...p} d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></>;
      case 'chat': return <Path {...p} d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />;
      case 'cake': return <><Path {...p} d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" /><Path {...p} d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 .5" /><Path {...p} d="M12 12V8" /><Path {...p} d="M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z" /></>;
      case 'copy': return <><Rect {...p} x={8} y={8} width={12} height={12} rx={2} /><Path {...p} d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>;
      case 'check': return <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
      case 'x': return <Path {...p} d="M6 6l12 12M18 6L6 18" />;
      case 'pin': return <><Path {...p} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><Circle {...p} cx={12} cy={9.5} r={2.5} /></>;
      case 'clock': return <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 7v5l3 2" /></>;
      case 'heart': return <Path {...p} d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />;
      case 'trash': return <Path {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
      case 'left': return <Path {...p} d="M15 5l-7 7 7 7" />;
      case 'right': return <Path {...p} d="M9 5l7 7-7 7" />;
      case 'search': return <><Circle {...p} cx={11} cy={11} r={6.5} /><Path {...p} d="M20 20l-4.2-4.2" /></>;
      case 'gift': return <><Rect {...p} x={3} y={9} width={18} height={12} rx={1.5} /><Path {...p} d="M12 9v12M3 13h18" /><Path {...p} d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z" /></>;
      case 'star': return <Path {...p} d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />;
      case 'card': return <><Rect {...p} x={3} y={5} width={18} height={14} rx={2} /><Path {...p} d="M3 9.5h18M7 15h4" /></>;
      case 'bank': return <><Path {...p} d="M3 9l9-5 9 5" /><Path {...p} d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18" /></>;
      case 'user': return <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21a8 8 0 0 1 16 0" /></>;
      case 'logout': return <><Path {...p} d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><Path {...p} d="M10 16l-4-4 4-4M6 12h10" /></>;
    }
  })();
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>;
}
