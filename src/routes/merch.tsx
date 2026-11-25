import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { MerchSection } from "@/components/artist/sections";
import { artistHead } from "@/lib/artist";
import { Button } from "@/components/ui/button";
import { MerchRequest } from "@/components/merch-request";
import { merchRelease, nativeMerchShop } from "@/config/merch-release";

const Sandbox =
  import.meta.env.DEV && import.meta.env.MODE === "merch-sandbox"
    ? lazy(() => import("@/components/merch-sandbox"))
    : null;
export const Route = createFileRoute("/merch")({
  head: () =>
    artistHead(
      "Wear the Vibe | Renzo Vibes",
      merchRelease || nativeMerchShop
        ? "Renzo Vibes Merchandise für den Versand innerhalb der Schweiz entdecken."
        : "Something special is coming. Discover the upcoming Renzo Vibes merchandise.",
    ),
  component: Page,
});
function Page() {
  const shopTarget = nativeMerchShop || (merchRelease ? "#merch-request" : null);
  return (
    <main>
      <MerchSection
        standalone
        requestAction={
          shopTarget && (
            <Button asChild variant="artistOutline">
              <a href={shopTarget} lang="de-CH" rel={nativeMerchShop ? "noreferrer" : undefined}>
                {nativeMerchShop ? "Merch im SumUp-Shop kaufen" : "Merch anfragen"}
              </a>
            </Button>
          )
        }
      />
      {merchRelease && <MerchRequest release={merchRelease} />}
      {Sandbox && (
        <Suspense fallback={<p role="status">Loading test shop…</p>}>
          <Sandbox />
        </Suspense>
      )}
    </main>
  );
}
