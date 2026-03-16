# iOS App Hardcoded String Localization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded UI strings in the iOS app with `localization.t()` calls, adding missing locale keys to all 10 language files.

**Architecture:** The iOS app uses `LocalizationManager` injected via `@Environment(LocalizationManager.self)` (non-optional) or `@Environment(\.localizationManager)` (optional). All locale keys live in `packages/ui/bayit-i18n/locales/`. 30 new keys are required; many fixes reuse existing keys.

**Tech Stack:** Swift/SwiftUI, `BayitLocalization`, `packages/ui/bayit-i18n/locales/*.json` (10 files)

---

## Summary of Changes

### New locale keys to add (all 10 language files)

Under `cultureClock`:

- `timeInIsrael` → "Time in Israel"
- `timeInNewYork` → "Time in New York, NY"

Under `friends`:

- `pendingRequests` → "Pending Requests"
- `emptyTitle` → "No friends yet"
- `emptySubtitle` → "Search for users to add friends"
- `addFriend` → "Add"

Under `watchParty`:

- `createNew` → "Create Party"
- `joinExisting` → "Join Party"
- `emptyTitle` → "No watch parties"
- `emptySubtitle` → "Create or join a party to watch together"
- `joinSubtitle` → "Enter the room code shared by the host"
- `roomCodePlaceholder` → "Room Code"
- `contentIdPlaceholder` → "Content ID"
- `contentType` → "Type"
- `maxParticipants` → "Max guests"

Under `trending`:

- `loadFailed` → "Failed to load trending"
- `headlines` → "Headlines"
- `trendingTopics` → "Trending Topics"

Under `voiceAssistant`:

- `testMicrophone` → "Test Microphone"
- `wakeWordDetected` → "Wake word detected!"
- `idle` → "Idle"

Under `talkBack`:

- `listeningForResponse` → "Listening for your response"
- `evaluatingResponse` → "Evaluating your response"

Under `chat`:

- `deleteChat` → "Delete Chat"

Under `widgets`:

- `createPersonal` → "Create personal widget"

Under `podcasts`:

- `refreshEpisodes` → "Refresh latest episodes"

Under `onboarding`:

- `featureTour` → "Feature Discovery Tour"

Under `proactiveSuggestions` (new section):

- `dismiss` → "Dismiss suggestion"
- `accept` → "Accept suggestion"

Under `player`:

- `channelChat` → "Channel Chat"

### Translations table for new keys

| Key                               | en                                       | he                                | es                                        | fr                                                 | hi                                            | bn                                       | ja                                         | zh                     | it                                               | ta                                              |
| --------------------------------- | ---------------------------------------- | --------------------------------- | ----------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------------------- | ------------------------------------------ | ---------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `cultureClock.timeInIsrael`       | Time in Israel                           | זמן בישראל                        | Hora en Israel                            | Heure en Israël                                    | इज़राइल में समय                               | ইসরায়েলে সময়                           | イスラエルの時間                           | 以色列时间             | Ora in Israele                                   | இஸ்ரேலில் நேரம்                                 |
| `cultureClock.timeInNewYork`      | Time in New York, NY                     | זמן בניו יורק                     | Hora en Nueva York                        | Heure à New York                                   | न्यूयॉर्क में समय                             | নিউ ইয়র্কে সময়                         | ニューヨークの時間                         | 纽约时间               | Ora a New York                                   | நியூயார்க்கில் நேரம்                            |
| `friends.pendingRequests`         | Pending Requests                         | בקשות ממתינות                     | Solicitudes pendientes                    | Demandes en attente                                | लंबित अनुरोध                                  | মুলতুবি অনুরোধ                           | 保留中のリクエスト                         | 待处理请求             | Richieste in attesa                              | நிலுவை கோரிக்கைகள்                              |
| `friends.emptyTitle`              | No friends yet                           | אין חברים עדיין                   | Aún sin amigos                            | Pas encore d'amis                                  | अभी तक कोई मित्र नहीं                         | এখনও কোনো বন্ধু নেই                      | まだ友達がいません                         | 还没有朋友             | Nessun amico ancora                              | இன்னும் நண்பர்கள் இல்லை                         |
| `friends.emptySubtitle`           | Search for users to add friends          | חפש משתמשים להוסיף חברים          | Busca usuarios para agregar amigos        | Recherchez des utilisateurs pour ajouter des amis  | मित्र जोड़ने के लिए उपयोगकर्ता खोजें          | বন্ধু যোগ করতে ব্যবহারকারী খুঁজুন        | 友達を追加するユーザーを検索               | 搜索用户以添加好友     | Cerca utenti per aggiungere amici                | நண்பர்களை சேர்க்க பயனர்களைத் தேடுங்கள்          |
| `friends.addFriend`               | Add                                      | הוסף                              | Agregar                                   | Ajouter                                            | जोड़ें                                        | যোগ করুন                                 | 追加                                       | 添加                   | Aggiungi                                         | சேர்                                            |
| `watchParty.createNew`            | Create Party                             | צור מסיבה                         | Crear fiesta                              | Créer une fête                                     | पार्टी बनाएं                                  | পার্টি তৈরি করুন                         | パーティーを作成                           | 创建派对               | Crea festa                                       | விழா உருவாக்கு                                  |
| `watchParty.joinExisting`         | Join Party                               | הצטרף למסיבה                      | Unirse a la fiesta                        | Rejoindre la fête                                  | पार्टी में शामिल हों                          | পার্টিতে যোগ দিন                         | パーティーに参加                           | 加入派对               | Unisciti alla festa                              | விழாவில் சேரு                                   |
| `watchParty.emptyTitle`           | No watch parties                         | אין מסיבות צפייה                  | Sin fiestas de visualización              | Pas de fêtes de visionnage                         | कोई वॉच पार्टी नहीं                           | কোনো ওয়াচ পার্টি নেই                    | ウォッチパーティーなし                     | 没有观影派对           | Nessuna watch party                              | கண்காணிப்பு விழாக்கள் இல்லை                     |
| `watchParty.emptySubtitle`        | Create or join a party to watch together | צור או הצטרף למסיבה לצפייה משותפת | Crea o únete a una fiesta para ver juntos | Créez ou rejoignez une fête pour regarder ensemble | साथ देखने के लिए पार्टी बनाएं या जुड़ें       | একসাথে দেখতে পার্টি তৈরি করুন বা যোগ দিন | 一緒に観るためのパーティーを作成または参加 | 创建或加入派对一起观看 | Crea o unisciti a una festa per guardare insieme | ஒன்றாக பார்க்க விழா உருவாக்கவும் அல்லது சேரவும் |
| `watchParty.joinSubtitle`         | Enter the room code shared by the host   | הזן את קוד החדר שהמארח שיתף       | Ingresa el código de sala del anfitrión   | Entrez le code de salle du organisateur            | होस्ट द्वारा साझा किया गया कमरा कोड दर्ज करें | হোস্ট দ্বারা শেয়ার করা রুম কোড লিখুন    | ホストが共有したルームコードを入力         | 输入主持人分享的房间码 | Inserisci il codice stanza condiviso dall'host   | ஹோஸ்ட் பகிர்ந்த அறை குறியீட்டை உள்ளிடுக         |
| `watchParty.roomCodePlaceholder`  | Room Code                                | קוד חדר                           | Código de sala                            | Code de salle                                      | कमरा कोड                                      | রুম কোড                                  | ルームコード                               | 房间码                 | Codice stanza                                    | அறை குறியீடு                                    |
| `watchParty.contentIdPlaceholder` | Content ID                               | מזהה תוכן                         | ID de contenido                           | ID de contenu                                      | सामग्री आईडी                                  | কন্টেন্ট আইডি                            | コンテンツID                               | 内容ID                 | ID contenuto                                     | உள்ளடக்க ஐடி                                    |
| `watchParty.contentType`          | Type                                     | סוג                               | Tipo                                      | Type                                               | प्रकार                                        | ধরন                                      | タイプ                                     | 类型                   | Tipo                                             | வகை                                             |
| `watchParty.maxParticipants`      | Max guests                               | מקסימום אורחים                    | Máximo de invitados                       | Maximum de participants                            | अधिकतम मेहमान                                 | সর্বোচ্চ অতিথি                           | 最大参加者数                               | 最多参与者             | Massimo partecipanti                             | அதிகபட்ச விருந்தினர்கள்                         |
| `trending.loadFailed`             | Failed to load trending                  | טעינת מגמות נכשלה                 | Error al cargar tendencias                | Impossible de charger les tendances                | ट्रेंडिंग लोड करना विफल                       | ট্রেন্ডিং লোড করতে ব্যর্থ                | トレンドの読み込み失敗                     | 加载趋势失败           | Caricamento tendenze fallito                     | ட்ரெண்டிங் ஏற்றுவதில் தோல்வி                    |
| `trending.headlines`              | Headlines                                | כותרות                            | Titulares                                 | Gros titres                                        | सुर्खियाँ                                     | শিরোনাম                                  | ヘッドライン                               | 头条新闻               | Titoli                                           | தலைப்புச் செய்திகள்                             |
| `trending.trendingTopics`         | Trending Topics                          | נושאים עולים                      | Temas de moda                             | Sujets tendance                                    | ट्रेंडिंग विषय                                | ট্রেন্ডিং বিষয়                          | トレンドトピック                           | 热门话题               | Argomenti di tendenza                            | டிரெண்டிங் தலைப்புகள்                           |
| `voiceAssistant.testMicrophone`   | Test Microphone                          | בדוק מיקרופון                     | Probar micrófono                          | Tester le microphone                               | माइक्रोफोन परीक्षण                            | মাইক্রোফোন পরীক্ষা করুন                  | マイクテスト                               | 测试麦克风             | Testa microfono                                  | மைக்ரோஃபோனை சோதிக்கவும்                         |
| `voiceAssistant.wakeWordDetected` | Wake word detected!                      | מילת הפעלה זוהתה!                 | ¡Palabra de activación detectada!         | Mot de déclenchement détecté!                      | वेक वर्ड डिटेक्ट हुआ!                         | ওয়েক ওয়ার্ড শনাক্ত হয়েছে!             | ウェイクワードが検出されました！           | 唤醒词已检测到！       | Parola di attivazione rilevata!                  | விழிப்பு வார்த்தை கண்டறியப்பட்டது!              |
| `voiceAssistant.idle`             | Idle                                     | בטל                               | Inactivo                                  | Inactif                                            | निष्क्रिय                                     | নিষ্ক্রিয়                               | アイドル                                   | 空闲                   | Inattivo                                         | செயலற்று                                        |
| `talkBack.listeningForResponse`   | Listening for your response              | מאזין לתגובה שלך                  | Escuchando tu respuesta                   | Écoute de votre réponse                            | आपकी प्रतिक्रिया सुन रहे हैं                  | আপনার প্রতিক্রিয়া শুনছি                 | あなたの返答を聞いています                 | 正在听您的回答         | In ascolto della tua risposta                    | உங்கள் பதிலை கேட்கிறோம்                         |
| `talkBack.evaluatingResponse`     | Evaluating your response                 | מעריך את תגובתך                   | Evaluando tu respuesta                    | Évaluation de votre réponse                        | आपकी प्रतिक्रिया का मूल्यांकन                 | আপনার প্রতিক্রিয়া মূল্যায়ন করছি        | あなたの返答を評価しています               | 正在评估您的回答       | Valutazione della tua risposta                   | உங்கள் பதிலை மதிப்பீடு செய்கிறோம்               |
| `chat.deleteChat`                 | Delete Chat                              | מחק צ'אט                          | Eliminar chat                             | Supprimer le chat                                  | चैट हटाएं                                     | চ্যাট মুছুন                              | チャットを削除                             | 删除聊天               | Elimina chat                                     | அரட்டையை நீக்கு                                 |
| `widgets.createPersonal`          | Create personal widget                   | צור ווידג'ט אישי                  | Crear widget personal                     | Créer un widget personnel                          | व्यक्तिगत विजेट बनाएं                         | ব্যক্তিগত উইজেট তৈরি করুন                | 個人ウィジェット作成                       | 创建个人小部件         | Crea widget personale                            | தனிப்பட்ட விட்ஜெட் உருவாக்கு                    |
| `podcasts.refreshEpisodes`        | Refresh latest episodes                  | רענן פרקים אחרונים                | Actualizar episodios recientes            | Actualiser les derniers épisodes                   | नवीनतम एपिसोड रिफ्रेश करें                    | সর্বশেষ এপিসোড রিফ্রেশ করুন              | 最新エピソードを更新                       | 刷新最新剧集           | Aggiorna episodi recenti                         | சமீபத்திய எபிசோட்களை புதுப்பிக்கவும்            |
| `onboarding.featureTour`          | Feature Discovery Tour                   | סיור גילוי תכונות                 | Tour de descubrimiento de funciones       | Tour de découverte des fonctionnalités             | फीचर डिस्कवरी टूर                             | ফিচার ডিসকভারি ট্যুর                     | 機能発見ツアー                             | 功能探索之旅           | Tour scoperta funzionalità                       | அம்சம் கண்டுபிடிப்பு சுற்றுப்பயணம்              |
| `proactiveSuggestions.dismiss`    | Dismiss suggestion                       | סגור הצעה                         | Descartar sugerencia                      | Ignorer la suggestion                              | सुझाव खारिज करें                              | পরামর্শ খারিজ করুন                       | 提案を却下                                 | 忽略建议               | Ignora suggerimento                              | பரிந்துரையை நிராகரிக்கவும்                      |
| `proactiveSuggestions.accept`     | Accept suggestion                        | קבל הצעה                          | Aceptar sugerencia                        | Accepter la suggestion                             | सुझाव स्वीकार करें                            | পরামর্শ গ্রহণ করুন                       | 提案を受け入れる                           | 接受建议               | Accetta suggerimento                             | பரிந்துரையை ஏற்கவும்                            |
| `player.channelChat`              | Channel Chat                             | צ'אט ערוץ                         | Chat del canal                            | Chat de la chaîne                                  | चैनल चैट                                      | চ্যানেল চ্যাট                            | チャンネルチャット                         | 频道聊天               | Chat del canale                                  | சேனல் அரட்டை                                    |

### Skipped (out of scope)

- `VODDebugView.swift` — debug/developer view, not user-facing
- `HelpView.swift:147` — version string contains dynamic build number, not UI copy
- `AuthComponents.swift:20` — brand "Bayit" is part of composite split-animation; no localization call
- Dynamic format accessibility strings (chess timer, quiz score, "Rank X: Name", subtitle overlay format) — require interpolation infrastructure not in scope
- Weather data strings (`"72°F"`, `"Sunny, Tel Aviv"`) — require weather service integration

---

## Task 1: Add new locale keys to all 10 JSON files

**Files:** `packages/ui/bayit-i18n/locales/{en,he,es,fr,hi,bn,ja,zh,it,ta}.json`

- [ ] Add `cultureClock.timeInIsrael` and `cultureClock.timeInNewYork` to all 10 files
- [ ] Add `friends.pendingRequests`, `friends.emptyTitle`, `friends.emptySubtitle`, `friends.addFriend` to all 10 files
- [ ] Add `watchParty.createNew`, `watchParty.joinExisting`, `watchParty.emptyTitle`, `watchParty.emptySubtitle`, `watchParty.joinSubtitle`, `watchParty.roomCodePlaceholder`, `watchParty.contentIdPlaceholder`, `watchParty.contentType`, `watchParty.maxParticipants` to all 10 files
- [ ] Add `trending.loadFailed`, `trending.headlines`, `trending.trendingTopics` to all 10 files
- [ ] Add `voiceAssistant.testMicrophone`, `voiceAssistant.wakeWordDetected`, `voiceAssistant.idle` to all 10 files
- [ ] Add `talkBack.listeningForResponse`, `talkBack.evaluatingResponse` to all 10 files
- [ ] Add `chat.deleteChat` to all 10 files
- [ ] Add `widgets.createPersonal` to all 10 files
- [ ] Add `podcasts.refreshEpisodes` to all 10 files
- [ ] Add `onboarding.featureTour` to all 10 files
- [ ] Add `proactiveSuggestions.dismiss`, `proactiveSuggestions.accept` to all 10 files (new section)
- [ ] Add `player.channelChat` to all 10 files
- [ ] Verify JSON is valid after edits
- [ ] Run `olorin-core/scripts/validate-i18n.sh --mode quick --dir packages/ui/bayit-i18n/locales`
- [ ] Commit: `feat(bayit/ios/i18n): add missing ios localization keys`

---

## Task 2: Fix SplashView+Helpers.swift

**File:** `ios-app/BayitPlusApp/Views/SplashView+Helpers.swift`

`localizedSlogan` builds its own hardcoded dictionary for all 10 languages, completely bypassing `localization.t()`. The key `splash.slogan` already exists in all 10 locale files with the correct translations.

Current code (lines 29-45):

```swift
var localizedSlogan: String {
    let slogans: [Language: String] = [
        .hebrew: "הבית שלך. בכל מקום.",
        .english: "Your Home. Anywhere.",
        // ... 8 more entries
    ]
    return slogans[localization.currentLanguage]
        ?? slogans[.english]
        ?? "Your Home. Anywhere."
}
```

- [ ] Replace entire `localizedSlogan` computed property with:

```swift
var localizedSlogan: String {
    localization.t("splash.slogan")
}
```

- [ ] Commit: `fix(bayit/ios): replace inline slogan dictionary with localization.t call`

---

## Task 3: Fix HomeView+Sections.swift

**File:** `ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift`

This extension has `localization` available from `HomeView`'s `@Environment(LocalizationManager.self) private var localization` or directly via non-optional `LocalizationManager`.

Hardcoded strings to fix:

| Line | Current                                 | Fix                                                           |
| ---- | --------------------------------------- | ------------------------------------------------------------- |
| ~77  | `locationLabel: "Time in Israel"`       | `locationLabel: localization.t("cultureClock.timeInIsrael")`  |
| ~84  | `locationLabel: "Time in New York, NY"` | `locationLabel: localization.t("cultureClock.timeInNewYork")` |
| ~142 | `title: "Israelis in Your City"`        | `title: localization.t("home.israelisInCity")`                |
| ~153 | `title: "Israeli Businesses Near You"`  | `title: localization.t("home.israeliBusinesses")`             |
| ~165 | `title: "Jerusalem"`                    | `title: localization.t("cities.jerusalem.title")`             |
| ~171 | `title: "Tel Aviv"`                     | `title: localization.t("cities.telAviv.title")`               |

Note: `home.israelisInCity`, `home.israeliBusinesses`, `cities.jerusalem.title`, `cities.telAviv.title` already exist in all 10 locale files.

- [ ] Apply all 6 replacements
- [ ] Commit: `fix(bayit/ios): localize home view city and location titles`

---

## Task 4: Fix TopNavigationBar.swift

**File:** `ios-app/BayitPlusApp/Views/Shared/TopNavigationBar.swift`

The view already has `@Environment(LocalizationManager.self) private var localization`. Three hardcoded accessibility labels:

| Line | Current                           | Key               | Existing value |
| ---- | --------------------------------- | ----------------- | -------------- |
| ~38  | `.accessibilityLabel("Language")` | `common.language` | "Language"     |
| ~74  | `.accessibilityLabel("Zeh Ani")`  | `nav.zehAni`      | "Zeh Ani"      |
| ~83  | `.accessibilityLabel("Profile")`  | `nav.profile`     | "Profile"      |

- [ ] Replace all 3 with `localization.t("...")` calls
- [ ] Commit: `fix(bayit/ios): localize navigation bar accessibility labels`

---

## Task 5: Fix TrendingRowView.swift

**File:** `ios-app/BayitPlusApp/Views/Content/TrendingRowView.swift`

Note: there is no `TrendingRowView.swift` file in the glob results — the actual file is `Views/Content/TrendingView.swift`. Read the file first to find the actual line numbers. Look for:

- Section headers `"Trending Topics"`, `"Headlines"`, `"Recommended for You"` in `sectionHeader(title:)` calls
- Error/alert message `"Failed to load trending"` in GlassAlert

Keys: `trending.trendingTopics`, `trending.headlines`, `home.recommended` (already exists: `"home.recommended"` = "Recommended for You"), `trending.loadFailed`.

- [ ] Read file and apply all fixes
- [ ] Commit: `fix(bayit/ios): localize trending view section headers and error`

---

## Task 6: Fix ChatbotView.swift

**File:** `ios-app/BayitPlusApp/Views/Chat/ChatbotView.swift`

Two fixes:

1. `Label("New Chat", systemImage: "plus.message")` — key `chat.newChat` already exists = "New Chat"
2. `Label("Delete Chat", systemImage: "trash")` — key `chat.deleteChat` (added in Task 1)

- [ ] Read the file and confirm line numbers
- [ ] Apply fixes using `localization.t(...)` calls (view should already have localization environment)
- [ ] Commit: `fix(bayit/ios): localize chatbot view action labels`

---

## Task 7: Fix WakeWord views

**Files:**

- `ios-app/BayitPlusApp/Views/Voice/WakeWordSettingsView+Sections.swift`
- `ios-app/BayitPlusApp/Views/Voice/WakeWordSensitivityView.swift`

Both files have these identical hardcoded strings:

- `GlassButton("Test Microphone", ...)` → `localization.t("voiceAssistant.testMicrophone")`
- `return "Wake word detected!"` → `localization.t("voiceAssistant.wakeWordDetected")`
- `return "Listening..."` → `localization.t("voiceAssistant.listening")` (existing key)
- `return "Idle"` → `localization.t("voiceAssistant.idle")`
- `message: "Microphone access granted"` → `localization.t("voiceOnboarding.permissionsGranted")` (existing key: `"voiceOnboarding.permissionsGranted"`)
- `message: "Microphone access denied. Check Settings."` — use `voiceAssistant.microphoneDenied` if it exists, otherwise add new key `voiceAssistant.microphoneDenied` = "Microphone access denied. Check Settings."

Check for existing keys before adding new ones. Read the files first to get exact context.

- [ ] Read both files, check existing localization setup
- [ ] Verify which keys already exist in en.json
- [ ] Add `voiceAssistant.microphoneDenied` to all 10 locale files if not present
- [ ] Apply all fixes in both files
- [ ] Commit: `fix(bayit/ios): localize wake word status and microphone labels`

---

## Task 8: Fix miscellaneous views

Multiple small fixes across several files. Read each file before editing.

**VoiceAvatarFAB.swift** (`Views/Shared/VoiceAvatarFAB.swift`):

- `.accessibilityLabel("Voice Assistant")` → `localization.t("voiceAssistant.fabLabel")` or `localization.t("voiceAssistant.title")`
- Check which key exists (both `voiceAssistant.fabLabel` and `voiceAssistant.title` = "Voice Assistant" exist)

**WidgetsView.swift** (`Views/Widgets/WidgetsView.swift`):

- `"Create personal widget"` accessibilityLabel → `localization.t("widgets.createPersonal")`
- `"Delete \(widget.title)"` accessibilityLabel — skip (dynamic format string)

**ProactiveSuggestionBannerView.swift** (`Views/Voice/ProactiveSuggestionBannerView.swift`):

- `"Dismiss suggestion"` → `localization.t("proactiveSuggestions.dismiss")`
- `"Accept suggestion"` → `localization.t("proactiveSuggestions.accept")`
- `"Proactive suggestion: \(suggestion.message ?? "")"` — skip (dynamic format)

**PodcastEpisodeListView.swift** — find in glob results under Views/Podcasts/:

- `"Refresh latest episodes"` → `localization.t("podcasts.refreshEpisodes")`
- `episode.title ?? "Episode"` fallback — use `localization.t("podcasts.episode")` if key exists, else skip

**FeatureTourView.swift** (`Views/Onboarding/Tour/FeatureTourView.swift`):

- `"Feature Discovery Tour"` → `localization.t("onboarding.featureTour")`

**AvatarModeView.swift** (`Views/Avatar/AvatarModeView.swift`):

- `"Close avatar mode"` accessibilityLabel — use `common.close` + screen name, or add `avatar.closeMode` key
- `"Avatar preferences"` accessibilityLabel → `localization.t("avatar.preferences")` (existing key)

**ChannelChatView.swift** (in BayitPlusApp):

- `"Close chat"` → `localization.t("player.channelChat")` combined with `common.close`, or add simple key

Check all views have localization environment before applying fixes. If a view uses optional `@Environment(\.localizationManager)` pattern, keep `?? "fallback"` style.

- [ ] Read and fix VoiceAvatarFAB.swift
- [ ] Read and fix WidgetsView.swift
- [ ] Read and fix ProactiveSuggestionBannerView.swift
- [ ] Read and fix PodcastEpisodeListView.swift (find actual file path)
- [ ] Read and fix FeatureTourView.swift (find actual file path)
- [ ] Read and fix AvatarModeView.swift (find actual file path)
- [ ] Commit: `fix(bayit/ios): localize miscellaneous view labels`

---

## Task 9: Fix Player accessibility labels (existing keys)

Read each file and apply fixes for accessibility labels where the key clearly already exists.

| File                                       | Hardcoded string                 | Use key                                          |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------ |
| `Player/SubtitleSettingsView.swift`        | `"Dismiss subtitle settings"`    | `common.dismiss` + context (skip - no exact key) |
| `Player/SubtitleSettingsView.swift`        | `"Subtitle font size"`           | `subtitles.fontSize`                             |
| `Player/SubtitleSettingsView.swift`        | `"Subtitle background opacity"`  | `subtitles.backgroundOpacity`                    |
| `Player/AudioTrackSelectorView.swift`      | `"Dismiss audio track selector"` | skip (no exact key)                              |
| `Player/MiniAudioPlayerBar.swift`          | `"Close player"`                 | `miniPlayer.closePlayer`                         |
| `Player/MiniAudioPlayerBar.swift`          | `"Chapters"`                     | `audiobooks.chapters`                            |
| `Player/MiniAudioPlayerBar.swift`          | `"Sleep timer"`                  | `player.sleepTimer.title`                        |
| `Player/MiniVideoPlayerBar.swift`          | `"Close player"`                 | `miniPlayer.closePlayer`                         |
| `Player/MiniAudioPlayerBar+Controls.swift` | `"Previous chapter"`             | `player.previousChapter`                         |
| `Player/MiniAudioPlayerBar+Controls.swift` | `"Skip backward 15 seconds"`     | `player.skipBackward`                            |
| `Player/MiniAudioPlayerBar+Controls.swift` | `"Skip forward 30 seconds"`      | `player.skipForward`                             |
| `Player/MiniAudioPlayerBar+Controls.swift` | `"Next chapter"`                 | `player.nextChapter`                             |
| `Player/TalkBackOverlayView.swift`         | `"Listening for your response"`  | `talkBack.listeningForResponse`                  |
| `Player/TalkBackOverlayView.swift`         | `"Evaluating your response"`     | `talkBack.evaluatingResponse`                    |
| `Player/PlayerView+ChatOverlay.swift`      | `"Channel chat"`                 | `player.channelChat`                             |
| `Player/PlayerView+LiveToolbar.swift`      | `"Channel chat"`                 | `player.channelChat`                             |

Read each file, verify the exact string is used as stated, confirm the referenced key value is appropriate, and apply the fix.

- [ ] Read and fix SubtitleSettingsView.swift
- [ ] Read and fix MiniAudioPlayerBar.swift and MiniVideoPlayerBar.swift
- [ ] Read and fix MiniAudioPlayerBar+Controls.swift
- [ ] Read and fix TalkBackOverlayView.swift
- [ ] Read and fix PlayerView+ChatOverlay.swift and PlayerView+LiveToolbar.swift
- [ ] Commit: `fix(bayit/ios): localize player accessibility labels`

---

## Task 10: Final validation

- [ ] Run `olorin-core/scripts/validate-i18n.sh --mode full --dir packages/ui/bayit-i18n/locales`
- [ ] Verify 0 missing/extra key errors
