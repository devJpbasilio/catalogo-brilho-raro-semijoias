/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Identidade visual da marca "Brilho Raro Semijoias".
 *
 * Mark = monograma entrelaçado "BR" (B ameixa + R dourado), sem moldura,
 * para superfícies claras. Uma variante `onDark` (B marfim) é usada sobre
 * fundos escuros (navbar), e uma versão com selo (framed) serve de favicon,
 * para sobreviver a qualquer cor de aba do navegador.
 *
 * Fonte do mark: serifada de sistema (Georgia) nas versões <img>/data-URI,
 * já que fontes web não carregam dentro de <img>. O componente BrandLogo
 * renderiza SVG inline e usa Cormorant Garamond (carregada via CSS).
 */

const MONO_FONT = "Cormorant Garamond, Georgia, 'Times New Roman', serif";

/** Gera o monograma entrelaçado (sem moldura). */
export function brandMonogramSvg(bColor = '#2B2332', gold1 = '#E4C879', gold2 = '#B0862F', font = "Georgia, 'Times New Roman', serif"): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 62 48" fill="none">` +
    `<defs><linearGradient id="brGold" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${gold1}"/><stop offset="1" stop-color="${gold2}"/>` +
    `</linearGradient></defs>` +
    `<text x="22" y="40" text-anchor="middle" font-family="${font}" font-size="46" font-weight="600" fill="${bColor}">B</text>` +
    `<text x="40" y="40" text-anchor="middle" font-family="${font}" font-size="46" font-weight="600" fill="url(#brGold)">R</text>` +
    `</svg>`
  );
}

/** Nome da fonte usada no componente inline (com Cormorant). */
export const BRAND_MONO_FONT = MONO_FONT;

/** Mark padrão (superfície clara), para uso em <img>. */
export const BRAND_MARK_SVG = brandMonogramSvg();

/** Logo da marca como data-URI (usável em qualquer <img src=...>). */
export const brandLogoDataUri = `data:image/svg+xml,${encodeURIComponent(BRAND_MARK_SVG)}`;
