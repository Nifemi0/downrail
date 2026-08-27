import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Downrail",
    short_name: "Downrail",
    description: "Conditional BTC and ETH downside-payout planning on DreamDEX.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#315cff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
