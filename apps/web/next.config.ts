import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Tauri Android wrapper.
  // Without this, 'next build' produces .next/server/ files — the Tauri WebView
  // reads from a file directory (../out/), not a Node server, resulting in a blank screen.
  output: "export",

  // The default Next.js image optimizer requires a running Node server.
  // It is incompatible with static export; use plain <img> or this flag.
  images: {
    unoptimized: true,
  },

  // Tauri resolves paths as directories, not files.
  // This causes Next.js to emit wallets/index.html instead of wallets.html,
  // which is required for correct file-system serving inside the Tauri WebView.
  trailingSlash: true,
};

export default nextConfig;
