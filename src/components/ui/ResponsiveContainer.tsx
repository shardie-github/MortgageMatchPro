import React, { memo, ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing, layout } from '../../utils/responsive';

interface ResponsiveContainerProps {
  children: ReactNode;
  padding?: keyof typeof spacing;
  margin?: keyof typeof spacing;
  backgroundColor?: string;
  style?: ViewStyle;
  safeArea?: boolean;
  scrollable?: boolean;
  centerContent?: boolean;
}

export const ResponsiveContainer = memo<ResponsiveContainerProps>(({
  children,
  padding = 'lg',
  margin = 'none',
  backgroundColor,
  style,
  safeArea = false,
  scrollable = false,
  centerContent = false,
}) => {
  const containerStyle = [
    styles.container,
    {
      padding: spacing[padding],
      margin: margin !== 'none' ? spacing[margin] : 0,
      backgroundColor,
      paddingTop: safeArea ? layout.safeAreaTop + spacing[padding] : spacing[padding],
      paddingBottom: safeArea ? layout.safeAreaBottom + spacing[padding] : spacing[padding],
      justifyContent: centerContent ? 'center' : 'flex-start',
      alignItems: centerContent ? 'center' : 'stretch',
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

ResponsiveContainer.displayName = 'ResponsiveContainer';