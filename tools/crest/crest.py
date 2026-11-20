"""Vector redraw of the Ibadan City Academy crest. Writes crest.svg (and variants)."""
import math
import sys

RED = '#DF231A'
GOLD = '#FDC307'
GOLD_DARK = '#D49A00'
GREEN = '#048E39'
INK = '#141414'
MONO = '#340A00'
BAND_RED = '#C0262B'
WHITE = '#FFFFFF'

W, H = 1000, 1080

SHIELD = ('M 78,34 L 146,66 L 854,66 L 922,34 L 866,158 '
          'C 906,300 906,520 848,686 C 794,846 650,946 500,1006 '
          'C 350,946 206,846 152,686 C 94,520 94,300 134,158 Z')

BAND_TOP, BAND_BOT = 322, 470


def palm(cx, crown_y, base_y):
    """Palm tree in green: tapering trunk, mound, drooping fronds."""
    parts = []
    # trunk, slightly curved, tapering upwards
    tb, tt = 30, 17
    parts.append(
        f'<path d="M {cx - tb},{base_y - 18} C {cx - tb + 4},{base_y - 120} {cx - tt - 6},{crown_y + 90} {cx - tt},{crown_y + 18} '
        f'L {cx + tt},{crown_y + 18} C {cx + tt - 2},{crown_y + 90} {cx + tb - 2},{base_y - 120} {cx + tb},{base_y - 18} Z" fill="{GREEN}"/>')
    # trunk rings
    # mound
    parts.append(f'<path d="M {cx - 110},{base_y + 4} C {cx - 96},{base_y - 30} {cx - 40},{base_y - 34} {cx},{base_y - 34} '
                 f'C {cx + 40},{base_y - 34} {cx + 96},{base_y - 30} {cx + 110},{base_y + 4} Z" fill="{GREEN}"/>')
    # fronds: (angle deg from vertical, length, droop)
    fronds = [(-112, 112, 0.62), (-86, 122, 0.48), (-60, 116, 0.34), (-34, 100, 0.22), (-12, 84, 0.12),
              (12, 84, 0.12), (34, 100, 0.22), (60, 116, 0.34), (86, 122, 0.48), (112, 112, 0.62)]
    ox, oy = cx, crown_y + 14
    for ang, length, droop in fronds:
        a = math.radians(ang)
        dx, dy = math.sin(a), -math.cos(a)
        tipx, tipy = ox + dx * length, oy + dy * length + droop * length * 0.9
        midx, midy = ox + dx * length * 0.55, oy + dy * length * 0.55 - 10
        nx, ny = -dy, dx  # normal
        wdt = 30
        parts.append(
            f'<path d="M {ox},{oy} Q {midx + nx * wdt:.1f},{midy + ny * wdt:.1f} {tipx:.1f},{tipy:.1f} '
            f'Q {midx - nx * wdt * 0.15:.1f},{midy - ny * wdt * 0.15 + 4:.1f} {ox},{oy} Z" fill="{GREEN}"/>')
    # fruit cluster
    parts.append(f'<ellipse cx="{cx}" cy="{crown_y + 22}" rx="34" ry="22" fill="{GREEN}"/>')
    return '\n'.join(parts)


def star(cx, cy, r, sw):
    pts = lambda off: ' '.join(f'{cx + r * math.cos(math.radians(off + 120 * k)):.1f},{cy + r * math.sin(math.radians(off + 120 * k)):.1f}' for k in range(3))
    return (f'<polygon points="{pts(-90)}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="miter"/>'
            f'<polygon points="{pts(90)}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="miter"/>')


def book(cx, cy):
    w, h = 128, 70
    cover = (f'<path d="M {cx - w - 20},{cy - h + 8} L {cx},{cy - h + 22} L {cx + w + 20},{cy - h + 8} '
             f'L {cx + w + 20},{cy + h + 16} L {cx},{cy + h + 30} L {cx - w - 20},{cy + h + 16} Z" fill="{INK}"/>')
    lp = (f'<path d="M {cx - w},{cy - h - 6} Q {cx - w / 2},{cy - h - 22} {cx - 6},{cy - h + 6} L {cx - 6},{cy + h + 4} '
          f'Q {cx - w / 2},{cy + h - 18} {cx - w},{cy + h - 6} Z" fill="{WHITE}"/>')
    rp = (f'<path d="M {cx + w},{cy - h - 6} Q {cx + w / 2},{cy - h - 22} {cx + 6},{cy - h + 6} L {cx + 6},{cy + h + 4} '
          f'Q {cx + w / 2},{cy + h - 18} {cx + w},{cy + h - 6} Z" fill="{WHITE}"/>')
    lines = []
    for i in range(6):
        t = -h + 22 + i * 19
        lines.append(f'<path d="M {cx - w + 16},{cy + t - 8} Q {cx - w / 2},{cy + t - 20} {cx - 20},{cy + t + 4}" stroke="#8A8A8A" stroke-width="4" fill="none"/>')
        lines.append(f'<path d="M {cx + w - 16},{cy + t - 8} Q {cx + w / 2},{cy + t - 20} {cx + 20},{cy + t + 4}" stroke="#8A8A8A" stroke-width="4" fill="none"/>')
    spine = f'<line x1="{cx}" y1="{cy - h + 10}" x2="{cx}" y2="{cy + h + 14}" stroke="{INK}" stroke-width="6"/>'
    return cover + lp + rp + ''.join(lines) + spine


def ribbon():
    """Gold scroll with the motto, drawn in front of the shield's lower edge."""
    out = []
    # rolled tails behind the outer ends
    out.append(f'<path d="M 62,782 C 18,770 6,812 26,842 L 34,878 L 70,860 Z" fill="{GOLD_DARK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>')
    out.append(f'<path d="M 938,782 C 982,770 994,812 974,842 L 966,878 L 930,860 Z" fill="{GOLD_DARK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>')
    # folds behind the PRO box
    out.append(f'<path d="M 402,958 L 432,1000 L 402,1040 Z" fill="{GOLD_DARK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>')
    out.append(f'<path d="M 598,958 L 568,1000 L 598,1040 Z" fill="{GOLD_DARK}" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>')
    # left and right bands
    out.append(f'<path d="M 62,782 Q 236,912 412,950 L 412,1040 Q 210,1000 34,878 Z" fill="{GOLD}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>')
    out.append(f'<path d="M 938,782 Q 764,912 588,950 L 588,1040 Q 790,1000 966,878 Z" fill="{GOLD}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>')
    # PRO box
    out.append(f'<path d="M 422,966 L 578,966 L 578,1062 L 422,1062 Z" fill="{GOLD}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>')
    out.append('<path id="mottoL" d="M 58,840 Q 228,962 410,1000" fill="none"/>')
    out.append('<path id="mottoR" d="M 590,1000 Q 772,962 942,840" fill="none"/>')
    t = f'font-family="Arimo" font-weight="700" font-size="44" fill="{INK}" letter-spacing="1"'
    out.append(f'<text {t}><textPath href="#mottoL" startOffset="50%" text-anchor="middle" dominant-baseline="central">DOMINI OPEERA</textPath></text>')
    out.append(f'<text {t}><textPath href="#mottoR" startOffset="50%" text-anchor="middle" dominant-baseline="central">BONO PUBLICO</textPath></text>')
    out.append(f'<text x="500" y="1030" text-anchor="middle" {t.replace("44", "50")}>PRO</text>')
    return '\n'.join(out)


def crest_body(band_text=True):
    s = []
    s.append(f'<clipPath id="shield"><path d="{SHIELD}"/></clipPath>')
    s.append('<g clip-path="url(#shield)">')
    s.append(f'<rect x="0" y="0" width="500" height="{BAND_TOP}" fill="{RED}"/>')
    s.append(f'<rect x="500" y="0" width="500" height="{BAND_TOP}" fill="{GOLD}"/>')
    s.append(f'<rect x="0" y="{BAND_TOP}" width="1000" height="{BAND_BOT - BAND_TOP}" fill="{WHITE}"/>')
    s.append(f'<rect x="0" y="{BAND_BOT}" width="500" height="700" fill="{GREEN}"/>')
    s.append(f'<rect x="500" y="{BAND_BOT}" width="500" height="700" fill="{WHITE}"/>')
    s.append(f'<line x1="500" y1="0" x2="500" y2="{BAND_TOP}" stroke="{INK}" stroke-width="7"/>')
    s.append(f'<line x1="500" y1="{BAND_BOT}" x2="500" y2="1100" stroke="{INK}" stroke-width="7"/>')
    s.append(f'<line x1="0" y1="{BAND_TOP}" x2="1000" y2="{BAND_TOP}" stroke="{INK}" stroke-width="8"/>')
    s.append(f'<line x1="0" y1="{BAND_BOT}" x2="1000" y2="{BAND_BOT}" stroke="{INK}" stroke-width="8"/>')
    # CA monogram
    s.append(f'<text x="312" y="278" text-anchor="middle" font-family="Playfair Display Black" font-size="270" fill="{MONO}">C</text>')
    s.append(f'<text x="318" y="262" text-anchor="middle" font-family="Playfair Display Black" font-size="178" fill="{MONO}" '
             f'stroke="{RED}" stroke-width="9" paint-order="stroke">A</text>')
    s.append(book(690, 196))
    if band_text:
        s.append(f'<text x="0" y="0" transform="translate(500 442) scale(0.70 1)" text-anchor="middle" font-family="Oswald SemiBold" '
                 f'font-size="114" fill="{BAND_RED}">IBADAN CITY ACADEMY</text>')
    s.append(star(318, 628, 122, 14))
    s.append(palm(682, 552, 812))
    s.append('</g>')
    s.append(f'<path d="{SHIELD}" fill="none" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>')
    s.append(ribbon())
    return '\n'.join(s)


def svg(inner, w=W, h=H, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'viewBox="0 0 {w} {h}" width="{w}" height="{h}">{b}{inner}</svg>')


def silhouette():
    """Single-colour crest for Android notification and themed (monochrome) icons."""
    s = [f'<mask id="cut"><rect width="1000" height="1080" fill="white"/>'
         f'<line x1="500" y1="40" x2="500" y2="1000" stroke="black" stroke-width="34"/>'
         f'<rect x="0" y="{BAND_TOP - 20}" width="1000" height="{BAND_BOT - BAND_TOP + 40}" fill="black"/></mask>',
         f'<path d="{SHIELD}" fill="white" mask="url(#cut)"/>',
         f'<path d="M 124,{BAND_TOP + 30} L 876,{BAND_TOP + 30} L 876,{BAND_BOT - 30} L 124,{BAND_BOT - 30} Z" fill="white"/>']
    return '\n'.join(s)


if __name__ == '__main__':
    open('crest.svg', 'w').write(svg(crest_body()))
    open('silhouette.svg', 'w').write(svg(silhouette()))
    print('ok')
