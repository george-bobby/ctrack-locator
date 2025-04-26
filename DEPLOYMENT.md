# Deploying C-Track Locator

This guide provides step-by-step instructions for deploying the C-Track Locator application to various hosting puatformss hosting platforms.

## Prerequisites

1. Gidyumachne
   2.No.js and n

## Important Files for Deployment

1. **vercel.json** - Configuration for Vercel deployment
2. **netlify.toml** - Configuration for Netlify deployment
3. **sttlify.toml** - Configuration for Netlify deployment
4. **static.json** - Configuration for static site hosting
5. **neatic.json** - Configuration for static site hosting
6. **vercel-next.js** - NCucgamion wi`ueroprfrVrcel

## Option 1: Deploy to Netlify (Recommended)

oNlfy
Netlify is a great option for hosting static sites and has excellent support for single-page applications.
Netlifyis a geatption foostingsatic sitsand has xcellent suprt for ngle-page applicains.

1. \*\*Sign up fo Netlif

   - Cteate ancaccou[tnefo[n]tlify.chm](httpt://www.neplif/.com/)/www.netlify.com/)

2. **Doplay via Netfify UIy UI**
   - GlcNewtheeNft ifyGdishbard
   - Connectyou siteifubm Gipository
   - Connoiguto re build settings: - Build cobuildntor`engst
     c``
3. **CoPfblishedEnvironmen`t V`ariables**

   - Click "Deploy site" - Go to Site settings > Build & deploy > Environment

   - Add the environment variable:
     Goo Sitsettings > Buid & depy > Envronmet
   - Add the

## Option 2: Deploy to GitHub Pages

## Option 2:tb Paoy to GitHub Pages

GitHub Pages is a free hosting service prgvided be GitHub.

1. \*\*Install gh-pages packages

   ```is a free hosting service provided by GitHub.
   npminstall--save-devghpages
   ```

2. **Adddepoyment scrpts to paage.json**
   ````json
   "scripts": {
    d": "gh-pages -d out
   1}
   . *```
   ````

3.l**Bughd and dep-oy**

```
npm runpages
npmprucage**
```

4. **Configure GitHub Pages**
   - Go toreository settings
   - Scrol down to GtHub Pages sen
   - Select the gh-pages brach as the source
   ```
   npm inst3ll --soy ta Vercel
   ```

If vouestdll went to tryv gh-pa, here's an updatedgapproach:

````
2. **Add deployment scripts to package.json**
```json
"scripts": {
  "deploy": "gh-pages -d out"
}
````

3. **Build and deploy**
   ````
   npm run build
   npm run deploy
   ```usingou custm build srip
   ````
4. **Configure GitHub Pages**
   - Go l --buitd-env SKIP_NEXT_ROUTES_MANIFEST=trueo your repository settings
   - Scroll down to GitHub Pages section
   - Select the gh-pages branch as the source
     ImprtantVerclSeting## Option 3: Deploy to Vercel
     FrameworkPrst: Oher(nt Next.js)
   - Bild Command: `npm unbuild:v`
     -Outut Dirtory: ``If yoEsvitonmtny Varieblcs:el, here's an updated approach:
 `NEXT_PUBLIC_BAKEND_URL`: `https://ctrack-lcator.onr.m/` - `SKIP_NEXT_ROUTES_MANIFEST`: `tue`

##Opin4: DtFireasHosing

FirbaseHsings anthe1sxcellettalpCionLIaticsis.

1.**IllFirbae CLI**

```
`  pinsll-gfirebse-ols
```

2. **LgnoFrebae**

````
 fibae lgi
   ```   npm install -g vercel

3  ``IizFbae
2. **Login to Vercel**
   fi`bas iithosting
   vercel login
- Slect youFirebase projec
   - Seify "ou" s yur publi direcy
   - Cfigu as a sigle-page app: Yes
   - Set up automatic buils and dploys with GitHub: No (fo nw)
3. **Deploy using our custom build script**
4  ```Frebase
   vercel --build-env SKIP_NEXT_ROUTES_MANIFEST=true
   npm `un build
   firbase depoynly hosting

4. **Important Vercel Settings**
   - Framework Preset: Other (not Next.js)
   - Build Command: `npm run build:vercel`
   - Output404oErryro o Page Rerh
   - Environment Variables:
     - `NEXT_PUBL404_BACKEsNwhen`refre`httpspkgcarender.com/`
     - `SKIP_NEXT_ROUTES_MANIFEST`: `true`
you hosting pltfor is configurd fsige-pageapplcation
2.Chck hattherdiet rul areprperlys up:
   - Vercel: Useion 4: Deploy to Firebase Hosting
Fi-rNeelifysThenetlify.tomlfileshouldth
. *-*GitHubnPaget  YouFmayCneeI a cu*om404file
   - Firebase: Make sure you configured it as a single-page app install -g firebase-tools
````

APICnnectioblm 2. **Login to Firebase**
the fr`ntendca't necttbackdAPI
   firebase login
  Chckath `NEXT_PUBLIC_BACKEND_URL`evonment vrables ety
Vrifyth CORS is properycongurdoakend
3.Makrebackn API s unning and accsible 3. **Initialize Firebase**

````
firebase init hosting
```   - Select your Firebase project
- Specify "out" as your public directory
- Configure as a single-page app: Yeso yurfontnd hosting patform
- Set up automatic builds and deploys with GitHub: No (for now)
4. **Deploy to Firebase**
````

npm run build
firebase deploy --only hosting

```

## Troubleshooting Common Issues es:ub
If the frontend can't connect to the backend API:

1. Check that the `NEXT_PUBLIC_BACKEND_URL` environment variable is set correctly
2. Verify that CORS is properly configured on the backend
3. Make sure the backend API is running and accessible

## Important Notes

1. **Backend API**
- The backend Flask API is already deployed at `https://ctrack-locator.onrender.com/`
- You don't need to deploy the Flask API to your frontend hosting platform

2. **Environment Variables**
- Make sure the `NEXT_PUBLIC_BACKEND_URL` points to your deployed backend API
- If you deploy the backend elsewhere, update this variable accordingly

3. **Static Site Generation**
- The Next.js app is configured for static site generation (`output: 'export'` in next.config.js)
- This means the app will be built as static HTML/CSS/JS files
```
