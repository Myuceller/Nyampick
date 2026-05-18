export function getAppUrl() {
  const canonicalUrl = process.env.NEXT_PUBLIC_CANONICAL_URL?.trim();
  if (canonicalUrl) return canonicalUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://www.nyampick.kr";
  }

  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return `https://${productionUrl.replace(/\/$/, "")}`;

  const deploymentUrl = process.env.VERCEL_URL?.trim();
  if (deploymentUrl) return `https://${deploymentUrl.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
