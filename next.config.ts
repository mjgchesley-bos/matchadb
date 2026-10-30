import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Credentials for the community-ratings store (see src/lib/ratings.ts). Hosting only exposes
  // build-time variables to the server bundle, so they are inlined here; they are only
  // referenced from server code.
  env: {
    RATINGS_S3_BUCKET: process.env.RATINGS_S3_BUCKET ?? "",
    RATINGS_ACCESS_KEY_ID: process.env.RATINGS_ACCESS_KEY_ID ?? "",
    RATINGS_SECRET_ACCESS_KEY: process.env.RATINGS_SECRET_ACCESS_KEY ?? "",
    RATINGS_AWS_REGION: process.env.RATINGS_AWS_REGION ?? "",
    RATINGS_PREFIX: process.env.RATINGS_PREFIX ?? "",
  },
};

export default nextConfig;
