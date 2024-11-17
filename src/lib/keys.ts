import { useEffect } from "react";

export type Alias = "mod"
export type Key = string | Alias
export type KeySeq = Key[]

function getOS() {
  let userAgent = navigator.userAgent

  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent)) {
    return "mac";
  }
  if (/Win32|Win64|Windows|WinCE/.test(userAgent)) {
    return "windows";
  }
  if (/Linux/.test(userAgent)) {
    return "linux";
  }
  if (/windows phone/i.test(userAgent)) {
    return "Windows Phone";
  }
  if (/android/i.test(userAgent)) {
    return "Android";
  }
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return "iOS";
  }

  return "Unknown";
}

const aliases = {
  mod: {
    mac: "Meta",
    linux: "Ctrl",
    windows: "Ctrl",
    default: "Ctrl"
  }
}

function alias(keybind: KeySeq): KeySeq {
  const os = getOS();
  let aliased = keybind;
  for (const [alias, binds] of Object.entries(aliases)) {
    aliased = keybind.map(v => {
      if (v.toLowerCase() == alias) {
        return os in binds ? binds[os] : binds.default;
      } else {
        return v;
      }
    })
  }
  return aliased;
}

export function hotkey(keys: KeySeq): string {
  return beautify(alias(keys)).join("+");
}

function beautify(keybind: KeySeq): KeySeq {
  const os = getOS();

  const beauty = {
    mac: {
      meta: "⌘",
      alt: "\u{2325}",
      option: "\u{2325}"
    },
    linux: {
      meta: "Alt"
    },
    windows: {
      meta: "Win"
    },
    default: {
      shift: "\u{21E7}",
    }
  }

  const osMap = os in beauty ? beauty[os] : {};
  const map = Object.assign(osMap, beauty.default)

  const beautfied = keybind.map(k => {
    return k.toLowerCase() in map ? map[k.toLowerCase()] : k;
  })

  return beautfied;
}

export type Modifier = "callOnce";
export interface KeyBind {
  cmd: KeySeq
  callback: () => any;
  mods?: Modifier | Modifier[];
}

export const useKeybindings = (...bindings: KeyBind[]) => {
  const currentlyPressedKeys = new Set<string>();
  const calledBindings = new Set<string>();

  const areAllKeysPressed = (keys: KeySeq) => keys.every(key => currentlyPressedKeys.has(key));

  const bindingsKeyDown = (e: KeyboardEvent) => {
    currentlyPressedKeys.add(e.key);
    console.log("Keys pressed:", Array.from(currentlyPressedKeys));

    bindings.forEach((binding) => {
      const resolved = alias(binding.cmd);
      const keyComboString = resolved.join("+");

      if (areAllKeysPressed(resolved)) {
        const hasCallOnce = binding.mods?.includes("callOnce");
        if (hasCallOnce && calledBindings.has(keyComboString)) return;

        binding.callback();

        if (hasCallOnce) {
          calledBindings.add(keyComboString);
        }
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
