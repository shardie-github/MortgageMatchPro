import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  image: string;
  color: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Welcome to MortgageMatch Pro',
    description: 'Your AI-powered mortgage intelligence platform for smarter home financing decisions.',
    image: '🏠',
    color: '#1e40af',
  },
  {
    id: 2,
    title: 'Advanced Analytics',
    description: 'Get comprehensive insights and analytics to optimize your mortgage strategy.',
    image: '📊',
    color: '#059669',
  },
  {
    id: 3,
    title: 'Multi-Lender Integration',
    description: 'Compare rates from multiple lenders and find the best deals for your needs.',
    image: '🏦',
    color: '#7c3aed',
  },
  {
    id: 4,
    title: 'Document Management',
    description: 'Securely manage and process all your mortgage documents in one place.',
    image: '📄',
    color: '#dc2626',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { login } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true,
      });
    } else {
      // Navigate to login
      login('demo@mortgagematchpro.com', 'demo123');
    }
  };

  const handleSkip = () => {
    login('demo@mortgagematchpro.com', 'demo123');
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingSlides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={[styles.imageContainer, { backgroundColor: slide.color }]}>
              <Text style={styles.emoji}>{slide.image}</Text>
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                {slide.title}
              </Text>
              <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                {slide.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === currentSlide 
                    ? theme.colors.primary 
                    : theme.colors.outline,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: theme.colors.onSurfaceVariant }]}>
              Skip
            </Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            contentStyle={styles.buttonContent}
          >
            {currentSlide === onboardingSlides.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 60,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    marginLeft: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});