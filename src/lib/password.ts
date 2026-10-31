import bcrypt from "bcryptjs";

// Cost factor 12: about 250 ms per hash, slow enough to resist brute force.
const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
