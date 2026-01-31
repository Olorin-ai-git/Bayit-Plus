import fs from 'fs';

const ja = JSON.parse(fs.readFileSync('ja.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
  return target;
}

const translations = {
  "nav": {
    "discover": "発見"
  },
  "search": {
    "trending": "トレンドの検索"
  },
  "liveTV": {
    "channels": "チャンネル"
  },
  "podcasts": {
    "episodes": "エピソード"
  },
  "account": {
    "billing": "お支払い"
  },
  "errors": {
    "tryAgain": "もう一度試す"
  },
  "player": {
    "loading": "読み込み中...",
    "retry": "再試行",
    "error": "動画の再生エラー",
    "back": "← 戻る",
    "liveBadge": "ライブ",
    "albumArt": "{{title}}のアルバムアート",
    "seekBar": "再生の進行状況",
    "skipBack": "{{seconds}}秒戻る",
    "skipForward": "30秒進む",
    "noStream": "ストリームが利用できません",
    "loadError": "ストリームの読み込みに失敗しました",
    "playbackSpeed": "再生速度",
    "previousChapter": "前のチャプター",
    "nextChapter": "次のチャプター",
    "skipBackward": "30秒戻る",
    "subscription": {
      "requiredTitle": "サブスクリプションが必要です",
      "requiredMessage": "は有料サブスクリプションが必要です",
      "upgradeInfo": "プレミアムコンテンツにアクセスするにはサブスクリプションをアップグレードしてください",
      "upgrade": "今すぐアップグレード"
    },
    "chapters": "チャプター",
    "sceneSearch": {
      "title": "シーン検索",
      "placeholder": "シーンを検索...",
      "inputLabel": "シーン検索入力",
      "searching": "検索中...",
      "noResults": "シーンが見つかりません",
      "resultsFound": "{{count}}件のシーンが見つかりました",
      "searchError": "検索に失敗しました。もう一度お試しください。",
      "hint": "2文字以上入力して検索",
      "voiceReceived": "検索中：{{query}}",
      "seekingTo": "{{time}}にジャンプ",
      "previous": "前へ",
      "next": "次へ",
      "result": {
        "jumpTo": "{{title}}（{{time}}）にジャンプ",
        "hint": "このシーンにジャンプするにはクリック"
      },
      "panelOpened": "シーン検索パネルが開きました",
      "navigation": "シーン検索ナビゲーション",
      "position": "結果{{current}} / {{total}}"
    }
  },
  "empty": {
    "noContent": "コンテンツがありません",
    "tryAnotherCategory": "別のカテゴリをお試しください",
    "noPodcasts": "ポッドキャストがありません",
    "tryLater": "後でもう一度お試しください",
    "noResults": "結果が見つかりません"
  },
  "content": {
    "play": "再生",
    "addToList": "リストに追加",
    "inList": "リスト内",
    "details": "詳細",
    "synopsis": "あらすじ",
    "genres": "ジャンル",
    "runtime": "上映時間",
    "released": "公開",
    "starring": "出演",
    "selectSeason": "シーズンを選択",
    "noEpisodes": "エピソードがありません",
    "noEpisodesAvailable": "再生可能なエピソードがありません",
    "loadingSeries": "シリーズ情報を読み込み中...",
    "votes": "票",
    "imdbRating": "IMDB評価",
    "preview": "プレビュー",
    "previewPlaying": "プレビュー再生中",
    "trailerPlaying": "予告編再生中",
    "youMayAlsoLike": "こちらもおすすめ",
    "relatedContent": "関連コンテンツ",
    "notFound": "コンテンツが見つかりません",
    "availableSubtitles": "利用可能な字幕",
    "subtitleSelected": "選択中：{{language}}",
    "ep": "エピソード"
  },
  "audiobooks": {
    "audiobook": "オーディオブック",
    "chapter": "チャプター",
    "chapters": "チャプター",
    "playChapter": "チャプターを再生",
    "noChapters": "チャプターがありません",
    "notFound": "オーディオブックが見つかりません",
    "author": "著者",
    "narrator": "ナレーター",
    "duration": "再生時間",
    "isbn": "ISBN"
  },
  "breadcrumbs": {
    "series": "シリーズ",
    "movie": "映画",
    "watching": "視聴中",
    "channel": "チャンネル",
    "station": "ステーション",
    "podcast": "ポッドキャスト",
    "watchlist": "ウォッチリスト",
    "downloads": "ダウンロード"
  },
  "favorites": {
    "items": "アイテム",
    "empty": "お気に入りがありません",
    "emptyHint": "お気に入りにアイテムを追加"
  },
  "downloads": {
    "items": "アイテム",
    "storage": "ストレージ",
    "empty": "ダウンロードがありません",
    "emptyHint": "オフライン視聴用にコンテンツをダウンロード"
  },
  "podcast": {
    "selectLanguage": "言語を選択",
    "switchToLanguage": "{{language}}に切り替え",
    "premiumRequiredForTranslation": "ポッドキャストの翻訳にはプレミアムサブスクリプションが必要です",
    "player": {
      "switchingLanguage": "切り替え中..."
    },
    "languages": {
      "he": {
        "short": "HE",
        "full": "ヘブライ語"
      },
      "en": {
        "short": "EN",
        "full": "英語"
      },
      "es": {
        "short": "ES",
        "full": "スペイン語"
      }
    }
  },
  "watchlist": {
    "filters": {
      "all": "すべて",
      "continue": "続きを見る",
      "movies": "映画",
      "series": "シリーズ",
      "kids": "キッズ",
      "judaism": "ユダヤ教",
      "podcasts": "ポッドキャスト",
      "radio": "ラジオ"
    },
    "items": "アイテム",
    "watched": "視聴済み",
    "empty": "ウォッチリストは空です",
    "emptyHint": "視聴を開始するとここに表示されます"
  },
  "widgets": {
    "empty": "ウィジェットがありません",
    "emptyHint": "ウィジェットはここに表示されます",
    "emptyPersonal": "個人ウィジェットがありません",
    "emptyPersonalHint": "最初の個人ウィジェットを作成するか、上のシステムウィジェットを追加してください",
    "itemsTotal": "合計ウィジェット数",
    "systemWidgets": "システムウィジェット",
    "systemWidgetsHint": "ウィジェットを閲覧してコレクションに追加",
    "myWidgets": "マイ個人ウィジェット",
    "myWidgetsHint": "作成したウィジェット",
    "personalWidgets": "マイウィジェット",
    "noSystemWidgets": "システムウィジェットがありません",
    "added": "追加済み",
    "add": "追加",
    "remove": "削除",
    "show": "表示",
    "hidden": "非表示",
    "addToCollection": "マイウィジェットに追加",
    "removeFromCollection": "マイウィジェットから削除",
    "contentTypes": {
      "liveChannel": "ライブチャンネル",
      "iframe": "Webコンテンツ",
      "podcast": "ポッドキャスト",
      "radio": "ラジオ",
      "vod": "ビデオ",
      "custom": "カスタム",
      "widget": "ウィジェット"
    },
    "form": {
      "title": "ウィジェットを作成",
      "basicInfo": "基本情報",
      "titlePlaceholder": "ウィジェットタイトル",
      "titleRequired": "ウィジェットタイトルは必須です",
      "descriptionPlaceholder": "説明（オプション）",
      "iconPlaceholder": "アイコン絵文字（例：📺）",
      "content": "コンテンツ",
      "fromLibrary": "ライブラリから",
      "iframe": "iFrame",
      "selectContent": "コンテンツを選択（チャンネル、ポッドキャスト、番組など）",
      "iframeUrl": "iFrame URL",
      "iframeUrlRequired": "iFrame URLは必須です",
      "iframeTitle": "iFrameタイトル",
      "positionSize": "位置とサイズ",
      "behavior": "動作",
      "mutedByDefault": "デフォルトでミュート",
      "closable": "閉じることができる",
      "draggable": "ドラッグ可能",
      "widgetOrder": "ウィジェット順序",
      "orderPlaceholder": "順序（0 = 最初）",
      "saveWidget": "ウィジェットを保存",
      "saving": "保存中...",
      "cancel": "キャンセル",
      "change": "変更"
    },
    "intro": {
      "title": "ウィジェットへようこそ",
      "description": "視聴体験をカスタマイズする強力なフローティングウィジェットを発見",
      "watchVideo": "紹介を見る",
      "skip": "スキップ",
      "dismiss": "今後表示しない",
      "videoUnavailable": "ビデオは一時的に利用できません",
      "loadingMartyJr": "Marty Jr.を読み込み中...",
      "loadingWidgets": "ウィジェット紹介を読み込み中..."
    }
  },
  "trending": {
    "title": "イスラエルのトレンド",
    "noTopics": "トレンドトピックがありません",
    "topStory": "トップストーリー",
    "sources": "情報源",
    "categories": {
      "security": "セキュリティ",
      "politics": "政治",
      "tech": "テクノロジー",
      "culture": "文化",
      "sports": "スポーツ",
      "economy": "経済",
      "entertainment": "エンターテインメント",
      "weather": "天気",
      "health": "健康",
      "general": "一般"
    }
  },
  "cultures": {
    "title": "文化を選択",
    "select": "文化を選択",
    "selectCulture": "文化を選択",
    "selectCultureDescription": "体験をパーソナライズするために文化コミュニティを選択",
    "changeCulture": "文化を変更",
    "israeli": {
      "name": "イスラエル",
      "description": "イスラエル在外コミュニティのコンテンツ"
    },
    "chinese": {
      "name": "中国",
      "description": "中国コミュニティのコンテンツ"
    },
    "japanese": {
      "name": "日本",
      "description": "日本コミュニティのコンテンツ"
    },
    "korean": {
      "name": "韓国",
      "description": "韓国コミュニティのコンテンツ"
    },
    "indian": {
      "name": "インド",
      "description": "インドコミュニティのコンテンツ"
    }
  },
  "cultureTrending": {
    "whatsHotIn": "{{location}}のトレンド",
    "noTopics": "トレンドトピックがありません",
    "sources": "情報源",
    "categories": {
      "security": "セキュリティ",
      "politics": "政治",
      "tech": "テクノロジー",
      "technology": "テクノロジー",
      "culture": "文化",
      "sports": "スポーツ",
      "economy": "経済",
      "finance": "金融",
      "entertainment": "エンターテインメント",
      "weather": "天気",
      "health": "健康",
      "food": "食",
      "fashion": "ファッション",
      "travel": "旅行",
      "history": "歴史",
      "expat": "在外生活",
      "general": "一般"
    }
  },
  "cultureCities": {
    "connectionTo": "{{city}}コネクション",
    "explore": "{{city}}を探索",
    "noContent": "この都市のコンテンツはありません",
    "categories": {
      "all": "すべて",
      "history": "歴史",
      "culture": "文化",
      "finance": "金融",
      "tech": "テクノロジー",
      "food": "食",
      "expat": "在外生活",
      "news": "ニュース",
      "entertainment": "エンターテインメント"
    }
  },
  "clock": {
    "israel": "イスラエル",
    "local": "現地",
    "shabbatShalom": "シャバットシャローム！",
    "erevShabbat": "シャバット前夜",
    "candleLighting": "ろうそく点灯",
    "parasha": "パラシャ"
  },
  "ritual": {
    "title": "朝のリチュアル",
    "greeting": "おはようございます！",
    "israelUpdate": "イスラエルは午後です。最新の動向についてニュースが報道しています",
    "recommendation": "朝のニュースから始めて、その後ラジオに切り替えることをお勧めします",
    "preparingRitual": "朝のリチュアルを準備中...",
    "israelTime": "イスラエル時間",
    "day": "日",
    "letsStart": "始めましょう",
    "skipToday": "今日はスキップ",
    "finish": "終了",
    "noContentNow": "現在利用可能なコンテンツはありません",
    "typeLive": "ライブ",
    "typeRadio": "ラジオ",
    "typeVideo": "ビデオ"
  },
  "watchParty": {
    "title": "ウォッチパーティー",
    "create": "パーティーを作成",
    "join": "パーティーに参加",
    "active": "パーティー開催中",
    "createTitle": "ウォッチパーティーを作成",
    "joinTitle": "パーティーに参加",
    "enterCode": "ルームコードを入力",
    "roomCode": "ルームコード",
    "roomCodeHint": "8文字のルームコードを入力してパーティーに参加",
    "copyCode": "コードをコピー",
    "codeCopied": "コードをコピーしました！",
    "participants": "参加者",
    "host": "ホスト",
    "you": "あなた",
    "leave": "パーティーを退出",
    "end": "パーティーを終了",
    "chat": "チャット",
    "sendMessage": "メッセージを送信",
    "typeMessage": "メッセージを入力...",
    "synced": "同期済み",
    "syncing": "同期中...",
    "hostPaused": "ホストが一時停止",
    "userJoined": "{{name}}が参加しました",
    "userLeft": "{{name}}が退出しました",
    "partyEnded": "パーティーが終了しました",
    "connecting": "接続中...",
    "options": {
      "chatEnabled": "チャットを有効にする",
      "syncPlayback": "再生を同期"
    },
    "errors": {
      "invalidCode": "無効なコード",
      "partyFull": "パーティーが満員です",
      "partyEnded": "パーティーは終了しました",
      "connectionError": "接続エラー",
      "createFailed": "パーティーの作成に失敗しました",
      "joinFailed": "パーティーへの参加に失敗しました"
    },
    "audio": {
      "mute": "ミュート",
      "unmute": "ミュート解除",
      "speaking": "話し中",
      "connecting": "音声に接続中...",
      "noAudio": "音声は利用できません",
      "muteHint": "マイクをミュート",
      "unmuteHint": "マイクのミュートを解除して話す"
    },
    "textOnlyMode": "テキストチャットのみ",
    "endParty": "パーティーを終了",
    "toggleEmoji": "絵文字ピッカーを切り替え",
    "toggleEmojiHint": "リアクション用の絵文字クイックピッカーを開きます",
    "sendEmoji": "{{emoji}}を送信",
    "sendEmojiHint": "チャットに絵文字リアクションを送信",
    "emojiPicker": "絵文字ピッカー",
    "chatInput": "チャットメッセージ入力",
    "chatInputHint": "パーティーチャットに送信するメッセージを入力",
    "sendMessageHint": "パーティーチャットにメッセージを送信",
    "copyCodeHint": "ルームコードをクリップボードにコピー",
    "share": "共有",
    "shareHint": "パーティーリンクを共有またはコードをコピー",
    "copied": "コピーしました！",
    "endPartyHint": "すべての参加者のパーティーを終了",
    "leaveParty": "パーティーを退出",
    "leavePartyHint": "パーティーを終了せずに退出",
    "buttonHint": "ウォッチパーティーを作成または参加するメニューを開く",
    "createHint": "新しいウォッチパーティーを作成",
    "joinHint": "コードで既存のウォッチパーティーに参加",
    "emojiPickerHint": "クイック絵文字リアクションを表示",
    "chatEnabledHint": "参加者のチャットを有効にする",
    "syncPlaybackHint": "ホストと再生を同期",
    "createPartyHint": "選択したオプションでパーティーを作成",
    "joinPartyHint": "入力したコードでパーティーに参加",
    "closePanelHint": "ウォッチパーティーパネルを閉じる",
    "cancelHint": "キャンセルしてダイアログを閉じる",
    "viewPartyHint": "ウォッチパーティーパネルを開く",
    "panel": "ウォッチパーティーパネル"
  },
  "footer": {
    "brandDescription": "アメリカでのあなたの家。ヘブライ語でのTV放送、VOD、ラジオ、ポッドキャスト。",
    "browse": "ブラウズ",
    "account": "アカウント",
    "legal": "法的情報",
    "location": "ニューヨーク、アメリカ",
    "links": {
      "home": "ホーム",
      "liveTV": "ライブTV",
      "vod": "映画＆シリーズ",
      "radio": "ラジオ",
      "podcasts": "ポッドキャスト",
      "judaism": "ユダヤ教",
      "profile": "マイプロフィール",
      "favorites": "お気に入り",
      "watchlist": "ウォッチリスト",
      "subscribe": "登録",
      "downloads": "ダウンロード",
      "help": "ヘルプセンター",
      "faq": "よくある質問",
      "contact": "お問い合わせ",
      "feedback": "フィードバック",
      "terms": "利用規約",
      "privacy": "プライバシーポリシー",
      "cookies": "Cookieポリシー",
      "licenses": "ライセンス"
    },
    "newsletter": {
      "title": "最新情報を受け取る",
      "description": "最新情報と限定コンテンツのためにニュースレターを購読",
      "placeholder": "メールアドレスを入力",
      "success": "購読ありがとうございます！"
    },
    "apps": {
      "title": "アプリを入手",
      "downloadOn": "からダウンロード",
      "getItOn": "で入手",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "navigation": "ナビゲーション",
    "liveTV": "ライブTV",
    "moviesAndSeries": "映画＆シリーズ",
    "radioStations": "ラジオ局",
    "myProfile": "マイプロフィール",
    "subscriptions": "サブスクリプション",
    "helpAndSupport": "ヘルプ＆サポート",
    "termsOfUse": "利用規約",
    "contactUs": "お問い合わせ",
    "poweredBy": "提供：",
    "sitemap": "サイトマップ"
  },
  "chapters": {
    "title": "チャプター",
    "noChapters": "チャプターがありません",
    "generating": "チャプターを生成中...",
    "jumpTo": "ジャンプ",
    "current": "現在",
    "categories": {
      "intro": "イントロダクション",
      "news": "ニュース",
      "security": "セキュリティ",
      "politics": "政治",
      "economy": "経済",
      "sports": "スポーツ",
      "weather": "天気",
      "culture": "文化",
      "conclusion": "まとめ"
    }
  }
};

deepMerge(ja, translations);
fs.writeFileSync('ja.json', JSON.stringify(ja, null, 2) + '\n');
console.log('Part 3 complete');
