/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useId } from 'react';
import { BRAND_MONO_FONT } from '../lib/brand';

interface BrandLogoProps {
  /** Altura do mark em pixels. */
  size?: number;
  /** Renderiza a variante para fundos escuros (B em marfim). */
  onDark?: boolean;
  /** Exibe o nome da marca ao lado do selo. */
  withWordmark?: boolean;
  /** Nome exibido quando withWordmark está ativo. */
  brandName?: string;
  /** Classe do texto (wordmark). */
  wordmarkClassName?: string;
  className?: string;
}

/**
 * Selo da marca "Brilho Raro": monograma entrelaçado BR (B ameixa/marfim + R
 * dourado). Renderiza SVG inline para poder usar a fonte Cormorant Garamond
 * carregada pela página.
 */
export default function BrandLogo({
  size = 40,
  onDark = false,
  withWordmark = false,
  brandName = 'Brilho Raro Semijoias',
  wordmarkClassName,
  className = '',
}: BrandLogoProps) {
  const uid = useId().replace(/[:]/g, '');
  const gradId = `brgold-${uid}`;
  const bColor = onDark ? '#F4EBDF' : '#2B2332';
  const gold1 = '#E6CB7C';
  const gold2 = onDark ? '#C9A24B' : '#AE8430';
  const width = Math.round(size * (62 / 48));

  const mark = (
    <svg
      width={width}
      height={size}
      viewBox="0 0 62 48"
      fill="none"
      role="img"
      aria-label={brandName}
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={gold1} />
          <stop offset="1" stopColor={gold2} />
        </linearGradient>
      </defs>
      <text x="22" y="40" textAnchor="middle" fontFamily={BRAND_MONO_FONT} fontSize="46" fontWeight="600" fill={bColor}>B</text>
      <text x="40" y="40" textAnchor="middle" fontFamily={BRAND_MONO_FONT} fontSize="46" fontWeight="600" fill={`url(#${gradId})`}>R</text>
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className="flex items-center gap-2.5">
      {mark}
      <span className={wordmarkClassName ?? `brand-wordmark text-lg ${onDark ? 'text-white' : 'text-neutral-800'}`}>
        {brandName}
      </span>
    </span>
  );
}
