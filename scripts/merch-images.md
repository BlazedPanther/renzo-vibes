# Merch-Bilder (freigestellt, einheitliche Grösse)

Die Bilder in `public/media/merch-*.webp` sind aus den Originalen in `source-media/merch-originals/` erzeugt:

1. `scripts/merch-cutout.py` stellt Shirt, Goat-Tee und Hoodie-Collage frei (Hintergrund transparent).
2. `scripts/merch-images.py` entfernt Farbsäume, teilt das Goat-Tee in Vorder-/Rückseite und legt jedes Produkt mittig auf eine
   900×900-Fläche mit gleichem Rand (90 %), damit alle gleich gross wirken.

Die Zwischenstufen `public/media/*-cutout.webp` und `rv-purple-hoodie-*.webp` sind die Eingaben für Schritt 2 (nicht auf der Seite verwendet).
Nur zur Neuerstellung nötig (Python 3, Pillow, numpy, scipy); die Seite selbst braucht diese Dateien nicht.
Bessere/grössere Originale in `source-media/merch-originals/` ablegen und die Skripte erneut ausführen.
