export function isLocal() {
  return !process.env.JWT_SECRET;
}