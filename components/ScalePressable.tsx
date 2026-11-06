import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  delayEnter?: number;
  disabled?: boolean;
}

export default function ScalePressable({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  delayEnter,
  disabled = false,
}: ScalePressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(delayEnter !== undefined ? 0 : 1)).current;
  const translateYAnim = useRef(new Animated.Value(delayEnter !== undefined ? 14 : 0)).current;

  useEffect(() => {
    if (delayEnter !== undefined) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 380,
          delay: delayEnter,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          delay: delayEnter,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [delayEnter]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
