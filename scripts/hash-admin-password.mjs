// Prints an ADMIN_PASSWORD_HASH for .env.local / Vercel.
// Usage: npm run admin:hash -- "a long passphrase"
// Same algorithm as lib/admin/password.ts.
import { randomBytes, scrypt } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run admin:hash -- "a passphrase of at least 12 characters"');
  process.exit(1);
}

const salt = randomBytes(16);
scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => {
  if (err) throw err;
  console.log(`ADMIN_PASSWORD_HASH=scrypt:16384:8:1:${salt.toString("base64url")}:${key.toString("base64url")}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
});
