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

## 1. Angaben (Stand 21.11.2026)
- [x] Bilder freigegeben (offizielle Künstlerseite) → `public/media/`
- [x] Verantwortlich: Renzo Vibes, renzovibez@gmail.com, Schweiz (Adresse nach DSG nicht zwingend, nicht angegeben)
- [x] Domain `renzovibes.com`, Spotify `7DOTyjrzC2XqXXD850bmxY`, Apple `1655332137` (live geprüft, CH-Store), YouTube `UCo0CiOUcsh9PwqbRslyGUsA` (live geprüft, „Renzo Vibes TV“), Instagram `renzovibez`
- [x] Bürgerlicher Name als Verantwortlicher: Lorenzo Di Meo (Künstlername Renzo Vibes)
- [x] renzovibes.ch-Link entfernt, ersetzt durch eigenen Linktree /links
- [ ] Impressum: für eine rein informierende CH-Künstlerseite i. d. R. nicht nötig; bei Verkauf (Merch-Shop) neu prüfen

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

---
## Alternative: Hosting auf Railway (aktuell genutzt, da GitHub-Konto wegen Abrechnung gesperrt war)
- Projekt `renzo-vibes-website`, Service `website`, Deploy bei jedem Push auf `main` (Dockerfile → Caddy, Port 8080). Test-URL: `website-production-885a2d5a.up.railway.app`.
- Hauptadresse: **www.renzovibes.com**; `renzovibes.com` leitet per Caddy/Infomaniak-Weiterleitung dorthin.
- DNS bei Infomaniak: `CNAME www → ovcg3rto.up.railway.app`, `TXT _railway-verify.www → railway-verify=ef029f12…` (genauer Wert im Railway-Dashboard unter Settings → Networking).
- Feeds (Videos/Releases) werden bei jedem Railway-Build neu geholt (Fallback auf `data/*.json`). Für regelmässige Updates in Railway einen Cron-Redeploy einrichten oder einmal pro Woche „Redeploy“ klicken.
- Kosten: Railway ist nach der Testphase kostenpflichtig (Hobby-Plan, ab ca. 5 $/Monat Nutzung).
