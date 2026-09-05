# Source

Freelance çalışanlar için tek panelde çalışma alanı: günlük hedefler, hatırlatıcılar, notlar,
müşteriler, projeler, ödeme vadeleri ve gelir–gider takibi.

Next.js 15 · React 19 · Tailwind v4 · shadcn/ui · Drizzle ORM · SQLite (libSQL)

## Kurulum

```bash
npm install
cp .env.example .env.local
node scripts/hash-password.mjs 'parolaniz'
```

Çıkan `AUTH_PASSWORD_HASH` ve `AUTH_SECRET` satırlarını `.env.local` içine yapıştırın,
`AUTH_USERNAME` değerini belirleyin, ardından:

```bash
npm run dev
```

Veritabanı ilk çalıştırmada `data/source.db` olarak oluşur; ayrı bir migration adımı yoktur.

## Parola

Parola ve kullanıcı adı **Ayarlar → Hesap** bölümünden değiştirilir; yeni değerler
veritabanında saklanır ve ortam değişkenlerini ezer. Parola değişince bu cihaz dışındaki
tüm oturumlar kapanır.

Parolayı unutursan sunucuda:

```bash
/opt/backup/source-reset-password.sh 'yeni-parola-en-az-12-karakter'
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `AUTH_USERNAME` | Giriş kullanıcı adı |
| `AUTH_PASSWORD_HASH` | Başlangıç parolası; `scripts/hash-password.mjs` üretir. Uygulamadan değiştirilince veritabanındaki değer geçerli olur |
| `AUTH_SECRET` | Oturum çerezini imzalar, en az 32 karakter |
| `DATABASE_URL` | Varsayılan `file:./data/source.db` |

## Modüller

| Sayfa | İçerik |
|---|---|
| Panel | Aylık gelir/gider ve net kâr, bekleyen tahsilat, bugünün hedefleri, geciken görev ve ödemeler, aktif projeler, nakit akışı grafiği |
| Görevler | Tarihe göre gruplama, hızlı ekleme, proje filtresi, hatırlatıcı kurma |
| Notlar | Etiketli notlar, sabitleme, projeye veya müşteriye bağlama |
| Müşteriler | İletişim ve fatura bilgileri, müşteri başına tahsilat ve bekleyen tutar |
| Projeler | Durum, öncelik, ilerleme, bütçe/tahsilat oranı, görev ve ödeme listesi |
| Ödemeler | Vade takibi, gecikme uyarısı, tek tıkla tahsilat kaydı, tekrarlı ödemeler |
| Gelir / Gider | Dönem seçimli özet, kategori dağılımı, hareket listesi |
| Ayarlar | Tema, bildirim izni, JSON yedek, veri yönetimi |

## Hatırlatıcılar

Göreve tarih–saat verildiğinde zamanı gelince sesli uyarı ve tarayıcı bildirimi gönderilir.
Bildirim izni Ayarlar sayfasından verilir. Hatırlatıcılar uygulama sekmesi açıkken çalışır.

## Kısayollar

`Ctrl/⌘ + K` komut paleti · `1`–`7` sayfa geçişi

## Docker

```bash
docker build -t source .
docker run -p 3000:3000 -v source-data:/app/data \
  -e AUTH_USERNAME=... -e AUTH_PASSWORD_HASH=... -e AUTH_SECRET=... source
```

Veritabanı `/app/data` altında tutulur; kalıcılık için bu dizin bir volume'a bağlanmalıdır.

## Bilinen sınırlar

- Kayıtlar kendi para birimini tutar; özet ve grafiklerdeki toplamlar kur çevrimi yapmaz.
- Tek kullanıcılıdır.
