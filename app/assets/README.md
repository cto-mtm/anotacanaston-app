# App icons & splash screens

No binary assets live in the scaffold. To generate native icons/splash:

1. Drop a 1024×1024 `icon.png` and a 2732×2732 `splash.png` into this folder
   (optionally `icon-foreground.png` / `icon-background.png` for Android
   adaptive icons).
2. Run `npm run cap:assets` from `app/` — `@capacitor/assets` generates every
   required size for iOS and Android directly into the native projects.
3. Re-run after every `npx cap add <platform>`.
