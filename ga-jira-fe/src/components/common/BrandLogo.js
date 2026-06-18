import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import colors from '../../theme/colors';

const WORDMARK_VIEWBOX = '0 0 680 270';
const MARK_VIEWBOX = '0 0 128 128';

const BrandLogo = ({
  width = 220,
  height = 88,
  variant = 'wordmark',
  tone = 'dark',
  style,
}) => {
  const isLight = tone === 'light';
  const textColor = isLight ? '#FFFFFF' : colors.brand.navy;
  const accent = colors.brand.gold;
  const accentDark = isLight ? colors.brand.goldLight : colors.brand.goldDark;

  if (variant === 'mark') {
    return (
      <Svg width={width} height={height} viewBox={MARK_VIEWBOX} style={style}>
        <Defs>
          <LinearGradient id="mark-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brand.navy} />
            <Stop offset="1" stopColor={colors.brand.sky} />
          </LinearGradient>
        </Defs>
        <Rect x="8" y="8" width="112" height="112" rx="14" fill="url(#mark-bg)" />
        <SvgText
          x="26"
          y="70"
          fill="#FFFFFF"
          fontSize="38"
          fontWeight="800"
          fontFamily="Arial"
        >
          GA
        </SvgText>
        <Path
          d="M18 84 H68 L74 39 L91 73 L116 84"
          fill="none"
          stroke={accent}
          strokeWidth="6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </Svg>
    );
  }

  return (
    <Svg width={width} height={height} viewBox={WORDMARK_VIEWBOX} style={style}>
      <SvgText
        x="0"
        y="82"
        fill={textColor}
        fontSize="88"
        fontWeight="800"
        fontFamily="Arial"
      >
        General
      </SvgText>
      <Path
        d="M6 110 H370 L386 22 L416 30 L463 94 L674 112"
        fill="none"
        stroke={accent}
        strokeWidth="11"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <Path
        d="M372 111 H674"
        fill="none"
        stroke={accentDark}
        strokeWidth="6"
        strokeLinecap="square"
      />
      <SvgText
        x="0"
        y="225"
        fill={textColor}
        fontSize="96"
        fontWeight="800"
        fontFamily="Arial"
      >
        Aeronautics
      </SvgText>
    </Svg>
  );
};

export default BrandLogo;
