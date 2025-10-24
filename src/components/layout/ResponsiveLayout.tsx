import React, { memo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsiveContainer } from '../ui/ResponsiveContainer';
import { spacing, layout, isSmallScreen, isMediumScreen, isLargeScreen } from '../../utils/responsive';

interface ResponsiveLayoutProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  safeArea?: boolean;
  padding?: keyof typeof spacing;
  backgroundColor?: string;
  style?: any;
}

export const ResponsiveLayout = memo<ResponsiveLayoutProps>(({
  children,
  scrollable = true,
  keyboardAvoiding = true,
  safeArea = true,
  padding = 'lg',
  backgroundColor,
  style,
}) => {
  const insets = useSafeAreaInsets();
  
  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: safeArea ? insets.top + spacing[padding] : spacing[padding],
      paddingBottom: safeArea ? insets.bottom + spacing[padding] : spacing[padding],
    },
    style,
  ];

  const content = (
    <View style={containerStyle}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

ResponsiveLayout.displayName = 'ResponsiveLayout';