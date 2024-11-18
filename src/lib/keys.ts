import { useEffect } from "react";

export type Alias = "mod";
export type Key = string | Alias;
export type KeySeq = Key[];

const OS = (() => {
  if (typeof navigator === "undefined") return "Unknown"; // make SSR happy
  const userAgent = navigator.userAgent;
  if (/Mac/.test(userAgent)) return "mac";
  if (/Win/.test(userAgent)) return "windows";
  if (/Linux/.test(userAgent)) return "linux";
  if (/windows phone/i.test(userAgent)) return "Windows Phone";
  if (/android/i.test(userAgent)) return "Android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS";
  return "Unknown";
});

const aliases: Record<Alias, Record<string, string>> = {
  mod: {
    mac: "Meta",
    linux: "Ctrl",
    windows: "Ctrl",
    default: "Ctrl",
  },
};

const beautifyMap: Record<string, Record<string, string>> = {
  mac: { meta: "⌘", alt: "\u{2325}", option: "\u{2325}" },
  linux: { meta: "Alt" },
  windows: { meta: "Win" },
  default: { shift: "\u{21E7}" },
};

const alias = (keybind: KeySeq): KeySeq =>
  keybind.map((key) =>
    key.toLowerCase() in aliases
      ? aliases[key.toLowerCase() as Alias][OS()] || aliases[key.toLowerCase() as Alias].default
      : key
  );

const beautify = (keybind: KeySeq): KeySeq =>
  keybind.map((key) =>
    beautifyMap[OS()]?.[key.toLowerCase()] || beautifyMap.default[key.toLowerCase()] || key
  );

export function hotkey(keys: KeySeq): string {
  return beautify(alias(keys)).join("+");
}

export type Modifier = "callOnce";
export interface KeyBind {
  cmd: KeySeq;
  callback: () => void;
  mods?: Modifier | Modifier[];
}

export const useKeybindings = (...bindings: KeyBind[]) => {
  const currentlyPressedKeys = new Set<string>();
  const calledBindings = new Set<string>();

  const areAllKeysPressed = (keys: KeySeq) => keys.every((key) => currentlyPressedKeys.has(key));

  const bindingsKeyDown = (e: KeyboardEvent) => {
    currentlyPressedKeys.add(e.key);

    bindings.forEach(({ cmd, callback, mods }) => {
      const resolved = alias(cmd);
      const keyComboString = resolved.join("+");

      if (areAllKeysPressed(resolved)) {
        if (mods?.includes("callOnce") && calledBindings.has(keyComboString)) return;

        callback();
        if (mods?.includes("callOnce")) calledBindings.add(keyComboString);
      }
    });
  };

  const bindingsKeyUp = (e: KeyboardEvent) => {
    currentlyPressedKeys.delete(e.key);
    calledBindings.clear();
  };

  useEffect(() => {
    document.addEventListener("keydown", bindingsKeyDown);
    document.addEventListener("keyup", bindingsKeyUp);
    return () => {
      document.removeEventListener("keydown", bindingsKeyDown);
      document.removeEventListener("keyup", bindingsKeyUp);
    };
  }, []);
};
