import { NativeModules, Platform } from "react-native";

export function setNativeLocale(lang: string): void {
  if (Platform.OS === "android" && NativeModules.LocaleModule) {
    NativeModules.LocaleModule.setLocale(lang);
  }
}
