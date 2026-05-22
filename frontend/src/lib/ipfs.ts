export function ipfsUrl(hash: string): string {
  if (!hash) return "";
  if (hash.startsWith("/") || hash.startsWith("http")) return hash;
  return `https://cloudflare-ipfs.com/ipfs/${hash}`;
}
