import dns from 'dns/promises';
import net from 'net';

/**
 * Guards outbound requests to user-supplied URLs (the webhook relay) against
 * SSRF: in production the URL must be HTTPS and resolve only to public
 * addresses, so it can't reach the cloud metadata service or private networks.
 */

const PRIVATE_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
];

function v4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = v4ToInt(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (value & mask) === (v4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    );
  }
  return true;
}

function enforcePublicTargets(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

export async function assertSafeOutboundUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('Webhook relay URL is not a valid URL.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Webhook relay URL must start with http:// or https://');
  }
  if (!enforcePublicTargets()) return url.toString();

  if (url.protocol !== 'https:') {
    throw new Error('Webhook relay URL must use https://');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) {
    throw new Error(`Webhook relay host "${url.hostname}" could not be resolved.`);
  }
  if (addresses.some(isPrivateAddress)) {
    throw new Error('Webhook relay URL must point to a public internet address.');
  }
  return url.toString();
}
