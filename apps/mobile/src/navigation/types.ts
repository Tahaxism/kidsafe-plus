import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelect: undefined;
  Login: undefined;
  Signup: undefined;
  ChildPin: undefined;
};

export type ParentTabParamList = {
  Dashboard: undefined;
  AI: undefined;
  Children: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type ParentStackParamList = {
  Tabs: NavigatorScreenParams<ParentTabParamList>;
  ChildDetail: { childId: string };
  ScreenTime: { childId: string };
  AppBlocking: { childId: string };
  WebFilter: { childId: string };
  Location: { childId: string };
  Recitation: { childId: string };
  AddChild: undefined;
  Language: undefined;
};

export type ChildStackParamList = {
  Home: undefined;
  RecitationGate: { ruleId: string };
  Blocked: { appName?: string; reason?: string };
  SOS: undefined;
  SafeBrowser: { url?: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Parent: NavigatorScreenParams<ParentStackParamList>;
  Child: NavigatorScreenParams<ChildStackParamList>;
  Splash: undefined;
};
