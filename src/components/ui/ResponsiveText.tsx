import React, { memo } from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography, fontSize, scale } from '../../utils/responsive';

interface ResponsiveTextProps extends TextProps {
  variant?: keyof typeof typography;
  size?: keyof typeof fontSize;
  color?: string;
  center?: boolean;
  bold?: boolean;
  children: React.ReactNode;
}

export const ResponsiveText = memo<ResponsiveTextProps>(({
  variant = 'body',
  size,
  color,
  center = false,
  bold = false,
  style,
  children,
  ...props
}) => {
  const textStyle = [
    styles.text,
    typography[variant],
    size && { fontSize: fontSize[size] },
    color && { color },
    center && styles.center,
    bold && styles.bold,
    style,
  ];

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  center: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
  },
});

ResponsiveText.displayName = 'ResponsiveText';