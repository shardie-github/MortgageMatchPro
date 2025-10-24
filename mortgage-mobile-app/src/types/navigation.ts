export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Calculator: undefined;
  Documents: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}