import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ParentStackParamList, ParentTabParamList } from './types';
import { colors } from '@/theme';
import { DashboardScreen } from '@/screens/parent/DashboardScreen';
import { AIAssistantScreen } from '@/screens/parent/AIAssistantScreen';
import { ChildrenScreen } from '@/screens/parent/ChildrenScreen';
import { AlertsScreen } from '@/screens/parent/AlertsScreen';
import { SettingsScreen } from '@/screens/parent/SettingsScreen';
import { ChildDetailScreen } from '@/screens/parent/ChildDetailScreen';
import { ScreenTimeScreen } from '@/screens/parent/ScreenTimeScreen';
import { AppBlockingScreen } from '@/screens/parent/AppBlockingScreen';
import { WebFilterScreen } from '@/screens/parent/WebFilterScreen';
import { LocationScreen } from '@/screens/parent/LocationScreen';
import { RecitationScreen } from '@/screens/parent/RecitationScreen';
import { AddChildScreen } from '@/screens/parent/AddChildScreen';
import { LanguageScreen } from '@/screens/parent/LanguageScreen';
import { NativePermissionsScreen } from '@/screens/parent/NativePermissionsScreen';

const Tab = createBottomTabNavigator<ParentTabParamList>();
const Stack = createNativeStackNavigator<ParentStackParamList>();

const tabIcon = (label: string) => () =>
  <Text style={{ fontSize: 18 }}>{label}</Text>;

const ParentTabs: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('parent.tabs.dashboard') as string,
          tabBarIcon: tabIcon('🏠'),
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: t('parent.tabs.ai') as string,
          tabBarIcon: tabIcon('🤖'),
        }}
      />
      <Tab.Screen
        name="Children"
        component={ChildrenScreen}
        options={{
          tabBarLabel: t('parent.tabs.children') as string,
          tabBarIcon: tabIcon('👨‍👩‍👧'),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: t('parent.tabs.alerts') as string,
          tabBarIcon: tabIcon('🔔'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('parent.tabs.settings') as string,
          tabBarIcon: tabIcon('⚙️'),
        }}
      />
    </Tab.Navigator>
  );
};

export const ParentNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.bg },
    }}
  >
    <Stack.Screen
      name="Tabs"
      component={ParentTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="ChildDetail" component={ChildDetailScreen} />
    <Stack.Screen name="ScreenTime" component={ScreenTimeScreen} />
    <Stack.Screen name="AppBlocking" component={AppBlockingScreen} />
    <Stack.Screen name="WebFilter" component={WebFilterScreen} />
    <Stack.Screen name="Location" component={LocationScreen} />
    <Stack.Screen name="Recitation" component={RecitationScreen} />
    <Stack.Screen name="AddChild" component={AddChildScreen} />
    <Stack.Screen name="Language" component={LanguageScreen} />
    <Stack.Screen
      name="NativePermissions"
      component={NativePermissionsScreen}
      options={{ title: 'Native permissions' }}
    />
  </Stack.Navigator>
);
