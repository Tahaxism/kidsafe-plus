import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ChildStackParamList } from './types';
import { colors } from '@/theme';
import { ChildHomeScreen } from '@/screens/child/HomeScreen';
import { ChildRecitationGateScreen } from '@/screens/child/RecitationGateScreen';
import { ChildBlockedScreen } from '@/screens/child/BlockedScreen';
import { ChildSOSScreen } from '@/screens/child/SOSScreen';
import { ChildSafeBrowserScreen } from '@/screens/child/SafeBrowserScreen';

const Stack = createNativeStackNavigator<ChildStackParamList>();

export const ChildNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.bg },
    }}
  >
    <Stack.Screen
      name="Home"
      component={ChildHomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RecitationGate"
      component={ChildRecitationGateScreen}
    />
    <Stack.Screen name="Blocked" component={ChildBlockedScreen} />
    <Stack.Screen name="SOS" component={ChildSOSScreen} />
    <Stack.Screen
      name="SafeBrowser"
      component={ChildSafeBrowserScreen}
      options={{ title: 'Safe browser' }}
    />
  </Stack.Navigator>
);
