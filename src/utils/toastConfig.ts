import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastMessage
      type="success"
      title={text1}
      message={text2}
      icon="check-circle"
    />
  ),
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastMessage
      type="error"
      title={text1}
      message={text2}
      icon="error"
    />
  ),
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastMessage
      type="info"
      title={text1}
      message={text2}
      icon="info"
    />
  ),
  warning: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastMessage
      type="warning"
      title={text1}
      message={text2}
      icon="warning"
    />
  ),
};

interface ToastMessageProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message?: string;
  icon: string;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ type, title, message, icon }) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.secondary;
      case 'error':
        return theme.colors.error;
      case 'info':
        return theme.colors.primary;
      case 'warning':
        return '#f59e0b';
      default:
        return theme.colors.surface;
    }
  };

  const getIconColor = () => {
    return '#ffffff';
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Icon name={icon} size={24} color={getIconColor()} style={styles.icon} />
      <View style={styles.textContainer}>
        {title && (
          <Text style={[styles.title, { color: getIconColor() }]}>
            {title}
          </Text>
        )}
        {message && (
          <Text style={[styles.message, { color: getIconColor() }]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    opacity: 0.9,
  },
});