# 🪙 Môj rozpočet

Osobná rozpočtová appka na Cloudflare. Postavená na **Cloudflare Pages + Workers + D1**.

## ✨ Funkcie

- 💰 Účty, transakcie, kategórie
- 📧 Envelope rozpočet (mesačné obálky)
- 🔁 Opakované platby (predplatné, nájom)
- 📊 Grafy a reporty
- 📱 QR sken bločkov (eKasa SK)
- 📸 Foto bločkov s OCR (Tesseract.js)
- 🔒 Heslom chránené
- 🌙 Dark mode

---

## 🚀 Deployment — krok po kroku

### Predpoklady
- GitHub účet
- Cloudflare účet (free tier stačí)
- Node.js nainštalované lokálne (kvôli `wrangler` CLI)

### 1. Vytvor GitHub repo

1. Choď na https://github.com/new
2. Pomenuj ho napríklad `budget-app`
3. Public alebo private — jedno
4. **Bez** README, .gitignore, license (sú už v týchto súboroch)
5. Klikni **Create repository**
6. Nahraj všetky tieto súbory (`index.html`, `worker.js`, `schema.sql`, `wrangler.toml`, `package.json`, `README.md`) do repa
   - Najjednoduchšie: drag & drop priamo cez GitHub web

### 2. Vytvor D1 databázu v Cloudflare

1. CF dashboard → **Workers & Pages** → **D1 SQL Database** → **Create database**
2. Názov: `budget-db`
3. Location: **Western Europe** (najbližšie SK)
4. Klikni **Create**
5. **Skopíruj `Database ID`** z detailu databázy

### 3. Uprav `wrangler.toml`

V súbore `wrangler.toml` v repo:
- nahraď `DATABASE_ID_SEM` skutočným ID, ktoré si si skopíroval
- zmeň `APP_PASSWORD` na vlastné silné heslo

Commitni do GitHubu.

### 4. Nainštaluj wrangler a inicializuj databázu

Lokálne v termináli:

```bash
# Naklonuj repo
git clone https://github.com/TVOJ_USERNAME/budget-app.git
cd budget-app

# Nainštaluj wrangler
npm install

# Prihlás sa do Cloudflare
npx wrangler login

# Vytvor tabuľky v D1 databáze
npm run db:init
```

Tým sa do D1 nahrajú tabuľky (accounts, transactions, envelopes, recurring).

### 5. Deploy Worker (backend API)

```bash
npx wrangler deploy
```

Po deploye dostaneš URL ako:
```
https://budget-app.tvoj-account.workers.dev
```

**Skopíruj si túto URL.**

### 6. Vytvor Cloudflare Pages projekt (frontend)

1. CF dashboard → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → vyber GitHub → vyber repo `budget-app`
3. Build settings:
   - Framework preset: **None**
   - Build command: *(prázdne)*
   - Build output directory: `/`
4. Klikni **Save and Deploy**
5. Po deploye dostaneš URL ako `https://budget-app-xyz.pages.dev`

### 7. Prepoj frontend s Workerom

V súbore `index.html` nájdi riadok:

```js
const API_URL = ''; // ← prázdne = rovnaká doména
```

Zmeň na URL svojho Workera z kroku 5:

```js
const API_URL = 'https://budget-app.tvoj-account.workers.dev';
```

Commitni → Pages sa automaticky redeployuje.

### 8. Hotovo! 🎉

Otvor svoju Pages URL, prihlás sa heslom z `wrangler.toml` a začni rozpočtovať.

---

## 🔐 Bezpečnejšie heslo (odporúčané)

Namiesto hesla v `wrangler.toml` použi secret:

```bash
npx wrangler secret put APP_PASSWORD
```

Zadá ti heslo a uloží sa zašifrované. V `wrangler.toml` potom môžeš sekciu `[vars]` zmazať.

---

## 📱 Pridanie na telefón (PWA)

1. Otvor Pages URL v Chrome/Safari na telefóne
2. Menu prehliadača → **Add to Home Screen**
3. Appka sa otvára ako natívna

---

## 🛠️ Lokálny vývoj

```bash
npm run db:init-local   # vytvor lokálnu D1
npm run dev             # spusti worker lokálne na :8787
```

Pre frontend otvor `index.html` priamo v prehliadači a v `API_URL` daj `http://localhost:8787`.

---

## 📂 Štruktúra súborov

```
budget-app/
├── index.html       # Frontend (celá UI)
├── worker.js        # Backend API (Cloudflare Worker)
├── schema.sql       # Databázová schéma (D1)
├── wrangler.toml    # Cloudflare konfigurácia
├── package.json     # npm scripts a wrangler
└── README.md        # Tento návod
```

---

## ❓ Problémy?

- **„Unauthorized" pri otvorení appky** → skontroluj heslo vo `wrangler.toml` a porovnaj s tým, čo zadávaš
- **„Database not found"** → spusti znova `npm run db:init`
- **CORS chyba** → skontroluj `API_URL` v `index.html`, musí byť presná URL Workera
- **OCR načítava dlho** → prvé spustenie sťahuje ~10 MB jazykového modelu, ďalšie sú rýchle

---

## 💸 Náklady

Cloudflare free tier:
- **Pages**: neobmedzené requesty
- **Workers**: 100 000 requestov/deň
- **D1**: 5 GB databáza, 5 mil. read/deň, 100k write/deň

Pre osobné použitie = **0 €/mesiac**.
