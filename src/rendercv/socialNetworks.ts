/**
 * Social network → URL/icon mapping for the header `_connections` fragment.
 *
 * Each known network maps to a Font Awesome icon name (no `fa-` prefix) and a
 * URL scheme. Unknown networks are tolerated: they simply produce no fragment
 * (spec: fields outside the MVP subset must not cause failures).
 *
 * The emitted fragment matches the design's header shape contract:
 *
 * ```typst
 * #connections(
 *   #connection-with-icon("github", [#link("https://github.com/pdgramajo")[#underline[github.com/pdgramajo]]]),
 * )
 * ```
 */

import type { SocialNetwork } from '../types/rendercv';

interface KnownNetwork {
  /** Font Awesome icon name passed to `connection-with-icon`. */
  icon: string;
  /** URL for a username. */
  url: (username: string) => string;
  /** Display text shown inside the link. */
  display: (username: string) => string;
}

const KNOWN_NETWORKS: Record<string, KnownNetwork> = {
  github: {
    icon: 'github',
    url: (username) => `https://github.com/${username}`,
    display: (username) => `github.com/${username}`,
  },
  linkedin: {
    icon: 'linkedin',
    url: (username) => `https://linkedin.com/in/${username}`,
    display: (username) => `linkedin.com/in/${username}`,
  },
  x: {
    icon: 'x-twitter',
    url: (username) => `https://x.com/${username}`,
    display: (username) => `x.com/${username}`,
  },
  mastodon: {
    icon: 'mastodon',
    url: (username) => `https://mastodon.social/@${username}`,
    display: (username) => `mastodon.social/@${username}`,
  },
};

/** Escape a value for embedding inside a Typst string content block. */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function isKnownNetwork(network: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_NETWORKS, network);
}

/**
 * One `#connection-with-icon(...)` content block for a known network, or
 * `null` for an unknown network (skipped silently).
 *
 * `#connections(...)` receives its items in code context, so each item must
 * be a content block: `[#connection-with-icon("icon")[#link(...)[...]]]`.
 */
export function connectionItem(socialNetwork: SocialNetwork): string | null {
  const known = KNOWN_NETWORKS[socialNetwork.network];
  if (known === undefined) {
    return null;
  }
  const url = escapeText(known.url(socialNetwork.username));
  const display = escapeText(known.display(socialNetwork.username));
  return (
    `[#connection-with-icon("${known.icon}")` +
    `[#link("${url}")[#underline[${display}]]]]`
  );
}

/**
 * The full `#connections(...)` header fragment, or `''` when no known network
 * is present. Unknown networks are skipped; the source order of known ones is
 * preserved.
 */
export function connectionsFragment(networks: SocialNetwork[]): string {
  const items = networks
    .map((socialNetwork) => connectionItem(socialNetwork))
    .filter((item): item is string => item !== null);
  if (items.length === 0) {
    return '';
  }
  return `#connections(\n${items.map((item) => `  ${item}`).join(',\n')},\n)`;
}