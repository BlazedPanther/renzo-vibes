import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import MerchShop, { type ShopPresentation } from "@/components/merch-shop";
import { MerchSection } from "@/components/artist/sections";
import { artistHead } from "@/lib/artist";

const Sandbox =
  import.meta.env.DEV && import.meta.env.MODE === "merch-sandbox"
    ? lazy(() => import("@/components/merch-sandbox"))
    : null;
export const Route = createFileRoute("/merch")({
  head: () =>
    artistHead(
      "Wear the Vibe | Renzo Vibes",
      "Something special is coming. Discover the upcoming Renzo Vibes merchandise.",
    ),
  component: Page,
});
function Page() {
  const [presentation, setPresentation] = useState<ShopPresentation>("closed");
  return (
    <main>
      {presentation !== "preorder" && (
        <MerchSection standalone shopOpen={presentation === "standard"} />
      )}
      {!Sandbox && <MerchShop onAvailability={setPresentation} />}
      {Sandbox && (
        <Suspense fallback={<p role="status">Loading test shop…</p>}>
          <Sandbox />
        </Suspense>
      )}
    </main>
  );
}
