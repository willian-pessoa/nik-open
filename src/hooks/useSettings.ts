import { useCallback, useState } from "react";
import type { PlayerSetting } from "../types";
import { loadSettings, saveSettings } from "../services/settingsStorage";

export function useSettings() {
  const [settings, setSettings] = useState<PlayerSetting>(() => loadSettings());

  const updateSettings = useCallback((next: PlayerSetting) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, updateSettings };
}
