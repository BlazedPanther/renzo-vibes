# Deploy-Checkliste

## 0. Repository (manuell, nicht automatisch erfolgt)
Die Arbeitsumgebung durfte kein neues Repository anlegen (Zugriff nur auf `BlazedPanther/renzo-vibes`). Der Code liegt auf Branch
`claude/rent2wipes-github-pages-d4kw17` dieses Repos. Neues öffentliches Repo **Rent2Wipes** im eigenen Account anlegen (nicht `karl95l`):
```sh
git remote -v                                   # Ziel prüfen! darf NICHT karl95l/renzo-vibes sein
gh repo create Rent2Wipes --public --source=. --remote=rent2wipes --disable-wiki
git push -u rent2wipes claude/rent2wipes-github-pages-d4kw17:main
```
Existiert der Name schon: nichts überschreiben, anderen Namen/Ort klären.

## 1. Offene Pflichtangaben (Platzhalter nie live!)
- [ ] **Zustimmung des Originalbetreibers** zu Bildern/Logo/Inhalten, Medien ablegen → `MEDIA.md`
- [ ] `legal.operatorName`, `operatorAddress`, `contactEmail`, `operatorCountry` → `src/config/site.config.ts`
- [ ] Rechtliche Prüfung der Datenschutzerklärung (Entwurf!) – CH-DSG Art. 19; DSGVO/IT nur falls Sitz/Zielpublikum EU/Italien → Sitz nicht aus `.ch` ableiten
- [ ] Impressum: prüfen, ob nötig (Warenangebot/Dienstleistung, EU-/IT-Betreiber → kann anders sein). Falls ja: `legal.impressum.enabled = true` und Felder füllen
- [ ] `domain`, `spotifyArtistId`, `appleArtistId`, `youtubeChannelId` (optional `instagramUrl`) → `CONTENT_CONFIG.md`
- [ ] Footer-Link „LINKS“/„DATENSCHUTZ“ ist gesetzt; Datenschutz-Link sichtbar auf allen Seiten ✔

Der Build bricht ab, solange `legal.*` `TODO:` enthält (Absicherung). Vorschau: Actions → *Run workflow* → `allow_placeholders` (Seite zeigt „ENTWURF“ – nicht veröffentlichen).

## 2. GitHub Pages
1. Repo → Settings → Pages → **Source: GitHub Actions**.
2. Actions → „Build & Deploy“ → Run workflow (oder Push auf `main`).
3. Nach erfolgreichem Deploy: Settings → Pages → **Custom domain** = kanonische Domain eintragen (erst wenn DNS gesetzt ist) → **Enforce HTTPS** aktivieren, sobald das Zertifikat bereit ist.
4. **Domain-Verifizierung (gegen Übernahme):** Settings → (Account) Pages → *Verified domains* → Domain hinzufügen, den TXT-Eintrag bei Infomaniak setzen. Domain **nie** in Pages eintragen, ohne dass der DNS-Eintrag existiert (Takeover-Risiko durch hängende Einträge); bei Domainwechsel alte Einträge löschen.

## 3. Infomaniak-DNS (nur der Domaininhaber)
Infomaniak Manager → Web & Domain → Domains → *Domain* → **DNS-Zone**. **Bestehende MX/TXT (E-Mail, SPF/DKIM) nicht ändern/löschen.**
Offizielle GitHub-Pages-IPs vor dem Eintrag gegen https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site prüfen. Stand der Doku bei Erstellung (bitte verifizieren):
- Apex (`example.ch`): **A** `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` und optional **AAAA** `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153`. Vorhandene konkurrierende A/AAAA/CNAME-Einträge der Apex ersetzen (nicht E-Mail-Einträge).
- `www`: **CNAME** `<github-user>.github.io.`
- Kanonische Domain wählen (Apex *oder* www); GitHub leitet die jeweils andere automatisch weiter, wenn beide korrekt gesetzt sind. In `site.config.ts` → `domain` die kanonische eintragen.
- Propagation prüfen: `dig example.ch +short`, `dig www.example.ch +short`; danach in Pages „DNS check“ abwarten, HTTPS erzwingen.
- Danach: `domain` setzen, neu deployen (erzeugt canonical, `sitemap.xml`, `robots.txt`, `CNAME`); Sitemap in Search Console optional einreichen.

## 4. Betrieb
- Feed-Refresh alle 6 h; **60-Tage-Regel** und Reaktivierung → README.
- Dependabot/`npm audit` gelegentlich prüfen; Action-Versionen sind auf Major gepinnt.
