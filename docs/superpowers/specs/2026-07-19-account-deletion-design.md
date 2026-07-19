# Hesap silme (account deletion) — tasarım

**Tarih:** 2026-07-19
**Kapsam:** backend + mobile. (Web silme sayfası App Store için gerekmiyor; Google Play submit'e ertelendi.)

## Amaç ve gerekçe

Uygulama App Store'da yayınlanacak. **Apple App Store Guideline 5.1.1(v):** hesap oluşturmayı
destekleyen uygulamalar (QuitQOS'ta Google/Apple/e-posta kaydı var) **uygulama içinden hesap silme**
sunmak zorundadır — "hesabı dondur" veya "destek'e yaz" kabul edilmez. Aynı akış KVKK'nın silme/imha
hakkını (md. 7, md. 11) da karşılar.

Guest kullanıcının backend'de verisi yoktur (her şey cihazda), dolayısıyla hesap silme yalnızca
**kayıtlı** kullanıcı için anlamlıdır ve yalnızca ona gösterilir.

## Kararlar (netleşmiş)

- **Silme türü:** Tam sil (hard delete) — anonimleştirme değil. KVKK "imha"ya en uygun, geri dönüşü yok.
- **Firebase Auth:** Firebase Authentication kaydı da silinir (bizim DB + Firebase kimlik kaydı birlikte).
- **Onay:** Basit "İptal / Sil" bottom-sheet. Ekstra "SIL yaz" sürtünmesi yok.
- **Yerleşim:** Settings footer'da, sign-out butonunun altında sessiz bir link (textTertiary, alt-çizgisiz).
- **Web sayfası:** Yapılmıyor (yalnızca App Store hedefteyken gereksiz; Play submit'e ertelendi).

## Mimari

### Backend — `DELETE /api/v1/users/me`

Yeni endpoint `UserController`'a eklenir; iş mantığı `UserService.deleteAccount(UUID userId)` içinde,
tek bir `@Transactional` metotta, FK bağımlılık sırasına göre:

1. `UserMilestoneRepository.deleteByUserId(userId)`
2. `QuitAttemptRepository.deleteByUserId(userId)`
3. `RefreshTokenRepository.deleteByUserId(userId)` (kullanıcının tüm refresh token'ları)
4. Silmeden **önce** `user.firebaseUid` okunur (User silinince erişilemez).
5. `userRepository.delete(user)`
6. **Firebase Auth silme:** DB transaction commit'inden **sonra**, ayrı adım —
   `FirebaseUserDeleter.delete(firebaseUid)`.

**Firebase silme hatası DB silmeyi geri almaz.** KVKK açısından bizim tuttuğumuz kişisel veri
silinmiştir; Firebase kimlik kaydı en kötü ihtimalle yetim kalır (aynı hesapla tekrar giriş yeni bir
User açar). Hata loglanır, kullanıcıya 204 dönmeye devam edilir.

**Seam:** `FirebaseUserDeleter` — ince bir arayüz + tek impl (`FirebaseAuth.getInstance(app).deleteUser`),
push-sender deseniyle (`PushNotificationSender`) tutarlı ve unit-test'te mock'lanabilir. `FirebaseApp`
bean'i `FirebaseConfig`'te zaten mevcut.

**Yanıt:** `204 No Content`. **Yetki:** endpoint `authenticated()` — mevcut `SecurityConfig` kuralları
yeterli (`/auth/**` dışı her şey authenticated), guest token'sız olduğu için çağıramaz.

**Repository eklemeleri:** her repo'ya `deleteByUserId(UUID)` (yoksa) — Spring Data derived delete.

**Test:** `UserService.deleteAccount` için unit test (Mockito) — doğru silme sırası, `firebaseUid`'in
silmeden önce okunduğu, Firebase deleter'ın çağrıldığı, Firebase hatasının DB'yi geri almadığı.

### Mobile

**a) Footer linki — `src/app/settings.tsx`**
Sign-out butonunun altına, yalnızca kayıtlı kullanıcıda görünen `textTertiary`, alt-çizgisiz, küçük
"Hesabımı sil" `Pressable`. Basınca onay sheet'ini açar.

**b) Onay sheet'i — `src/components/delete-account-sheet.tsx`**
Sükût bottom-sheet (streak-conflict / backdated ile aynı chrome: grabber + scrim + 28px). İçerik:
başlık ("Hesabını sil"), sakin ama net açıklama (geri alınamaz; streak, rozetler, sıralama kalıcı
silinir), iki buton — **İptal** (nötr) + **Sil** (danger dolu). Sil'e basınca buton **loading** state'e
geçer (product register: interaktif bileşen loading state ister). Controlled bileşen
(`visible`/`onConfirm`/`onCancel`), backdated-sheet gibi doğrudan `settings.tsx` içinde kullanılır
(module-level bridge gerekmez).

**c) Silme akışı — `src/hooks/use-auth.tsx` `deleteAccount()`**
`deleteMe(accessToken)` → başarılı → mevcut `signOut()` mantığını yeniden kullan (token temizle,
Firebase+Google'dan çıkış, guest'e dön) → `router.replace('/')`. Hata → sheet sakin hata mesajı
gösterir, kullanıcı oturumda kalır (non-fatal).

**d) API client — `src/lib/api.ts`**
`deleteMe(accessToken)` → `DELETE /users/me`, 204 bekler.

**e) i18n — `src/i18n/locales/{tr,en}.json`**
`settings.deleteAccount` (link) + `settings.deleteSheet.title/body/cancel/confirm/error`. İki dil.

**Akış (önce mockup):** footer link + sheet için HTML mockup (`design/sukut/settings-delete.html`,
light/dark) → kullanıcı onayı → RN'e uygula. Projenin yerleşik akışı.

## Kapsam dışı (YAGNI)

- Web silme sayfası — Play submit'e kadar gereksiz.
- Anonimleştirme / soft delete — hard delete seçildi.
- "SIL yaz" gibi ekstra onay sürtünmesi — basit İptal/Sil seçildi.
- Guest için "cihaz verisini sıfırla" — bu iş kapsamı dışı, ayrı ele alınabilir.

## Doğrulama

- Backend: `./mvnw -q compile` + yeni unit test `./mvnw test`.
- Mobile: `./node_modules/.bin/tsc --noEmit` + i18n JSON geçerliliği (`node -e "JSON.parse(...)"`).
- Uçtan uca (kullanıcı çalıştırır): kayıtlı kullanıcı → Hesabımı sil → onayla → guest'e döner;
  DB'de user/attempt/milestone/refresh_token satırları gitmiş, Firebase Console'da kullanıcı yok.
