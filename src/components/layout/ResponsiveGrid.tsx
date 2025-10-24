import React, { memo, ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing, isSmallScreen, isMediumScreen, isLargeScreen } from '../../utils/responsive';

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  gap?: keyof typeof spacing;
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export const ResponsiveGrid = memo<ResponsiveGridProps>(({
  children,
  columns = 1,
  gap = 'md',
  padding = 'none',
  style,
}) => {
  // Determine number of columns based on screen size
  const getColumns = (): number => {
    if (typeof columns === 'number') {
      return columns;
    }

    if (isSmallScreen()) {
      return columns.xs || 1;
    } else if (isMediumScreen()) {
      return columns.sm || columns.xs || 2;
    } else if (isLargeScreen()) {
      return columns.lg || columns.md || columns.sm || 3;
    }

    return columns.xs || 1;
  };

  const numColumns = getColumns();
  const gapSize = spacing[gap];
  const paddingSize = padding !== 'none' ? spacing[padding] : 0;

  const containerStyle = [
    styles.container,
    {
      padding: paddingSize,
    },
    style,
  ];

  const itemStyle = [
    styles.item,
    {
      width: `${100 / numColumns}%`,
      paddingHorizontal: gapSize / 2,
      paddingVertical: gapSize / 2,
    },
  ];

  // Wrap children in grid items
  const gridItems = React.Children.map(children, (child, index) => (
    <View key={index} style={itemStyle}>
      {child}
    </View>
  ));

  return (
    <View style={containerStyle}>
      <View style={styles.grid}>
        {gridItems}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.md / 2,
  },
  item: {
    // Width is set dynamically based on columns
  },
});

ResponsiveGrid.displayName = 'ResponsiveGrid';