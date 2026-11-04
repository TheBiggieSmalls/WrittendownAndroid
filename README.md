# Written Down – Android-app

1. Maak een lege (privé) GitHub-repo en upload ALLE bestanden uit deze map (inclusief `.github` en `keystore`).
2. Ga naar **Actions → Build APK → Run workflow** (of push naar `main`).
3. Na ± 5 min: open de run → onderaan **Artifacts → Written-Down-apk** → unzip → `app-debug.apk` op je telefoon installeren.
4. Open de app → tik op de **bel** → sta meldingen, agenda en "alarmen en herinneringen" toe.

Aanpassen? Vervang `www/index.html` en push; de build start opnieuw. De vaste sleutel in `keystore/` zorgt dat nieuwe versies als update over de oude installeren.
