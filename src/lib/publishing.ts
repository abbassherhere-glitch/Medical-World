/**
 * Which state pages are published, from the owner's list in
 * src/content/state-pages/. A mistake in the list (a misspelled or missing
 * state) stops the build with a clear message.
 */
export interface StatePageSwitch {
  state: string;
  published: boolean;
}

/**
 * Returns the names of the published states, in the order of `known`.
 * `known` is every state and DC that can have a page.
 */
export function publishedStates(list: StatePageSwitch[], known: string[], profession: string): string[] {
  const listed = new Map<string, boolean>();
  for (const entry of list) {
    if (!known.includes(entry.state)) {
      throw new Error(
        `State page list for ${profession}: "${entry.state}" is not a state or DC in the pay data. Check the spelling.`,
      );
    }
    if (listed.has(entry.state)) {
      throw new Error(`State page list for ${profession}: "${entry.state}" is listed twice.`);
    }
    listed.set(entry.state, entry.published);
  }
  const missing = known.filter((name) => !listed.has(name));
  if (missing.length) {
    throw new Error(
      `State page list for ${profession} is missing: ${missing.join(', ')}. Add each with "published": true or false.`,
    );
  }
  return known.filter((name) => listed.get(name) === true);
}

/**
 * Replaces {state} in every piece of text in a content object, so one
 * template can serve every state.
 */
export function fillState<T>(value: T, state: string): T {
  if (typeof value === 'string') return value.replaceAll('{state}', state) as T;
  if (Array.isArray(value)) return value.map((item) => fillState(item, state)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillState(v, state)])) as T;
  }
  return value;
}
