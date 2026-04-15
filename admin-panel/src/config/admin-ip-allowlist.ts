/**
 * Admin IP allowlist
 *
 * Edit this file to control which IPs can access `/admin` without login.
 *
 * Supported formats:
 * - Exact IP: "203.0.113.10"
 * - CIDR range: "203.0.113.0/24"
 *
 * Notes:
 * - Keep localhost entries unless you want to disable local bypass.
 * - In production behind a proxy, make sure x-forwarded-for is forwarded correctly.
 */
export const ADMIN_IP_ALLOWLIST: string[] = [
  "127.0.0.1",
  "::1",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
];

