// Small things remembered on this phone (not health data): e.g. that this week's coach
// note was read. The demo uses its own keys, so it never touches the real app's.
const PREFIX = import.meta.env.MODE === 'demo' ? 'gemeas-demo:' : 'gemeas:'

export function getPref(key: string) {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function setPref(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    // Private window or full storage: not important
  }
}
