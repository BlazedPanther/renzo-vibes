# Medien & Rechte

> **Freigabe:** Am 21.11.2026 hat der Projektverantwortliche bestätigt, dass die Bilder für die offizielle Künstlerseite von Renzo Vibes freigegeben sind. Die Dateien in `public/media/` stammen unverändert von der Lovable-Originalseite (Grössen = Manifest).

Das Original speichert Bilder nicht im Repo, sondern als Lovable-Pointer (`*.asset.json`). Die Metadaten stehen in `data/media-manifest.json`.
Die Bilder (Portrait, Logo, Merch-Fotos, Cover) gehören dem Künstler/Betreiber der Originalseite. Das Original-Repo enthält **keine Lizenz**.

**Vor dem Livegang:**
1. Schriftliche Zustimmung des Betreibers der Originalseite zur Übernahme/Veröffentlichung von Bildern, Logo, Musik-/Videoverweisen einholen.
2. Dateien bereitstellen – entweder vom Betreiber geliefert nach `public/media/` (Namen siehe Manifest) oder, **nur mit Zustimmung**:
   `MEDIA_RIGHTS_CONFIRMED=true npm run fetch-media` (lädt von der Lovable-Hosting-URL, prüft Grössen).
3. `public/media/*` ist in `.gitignore`. Zum Einchecken Zeile entfernen – erst nach Punkt 1.

Ohne diese Dateien baut die Seite fehlerfrei, zeigt aber Alt-Texte statt Bildern; es werden keine Ersatzbilder erfunden.
`og:image` wird nur gesetzt, wenn Domain **und** `public/media/renzo-cover.webp` vorhanden sind.
Video-Vorschaubilder (`public/thumbs`) werden von den Actions aus den eigenen YouTube-Videos gespiegelt; auch hierfür Zustimmung des Kanalinhabers einholen.
