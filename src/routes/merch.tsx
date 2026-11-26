import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import MerchShop, { ClosedMerchShop, type ShopPresentation } from "@/components/merch-shop";
import { MerchSection } from "@/components/artist/sections";
import { artistHead } from "@/lib/artist";

const Sandbox =
  import.meta.env.DEV && import.meta.env.MODE === "merch-sandbox"
    ? lazy(() => import("@/components/merch-sandbox"))
    : null;
export const Route = createFileRoute("/merch")({
  head: () =>
    artistHead(
      "Black Friday Merch | Renzo Vibes",
      "Explore five Renzo Vibes Black Friday pre-order pieces, with front and back product photography.",
    ),
  component: Page,
});
function Page() {
  const [presentation, setPresentation] = useState<ShopPresentation>("closed");
  return (
    <main>
      {presentation === "closed" && !Sandbox && <ClosedMerchShop />}
      {(presentation === "standard" || Sandbox) && (
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
