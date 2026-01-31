// Part 7: Complete ALL remaining missing keys
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
    "friends": "友達"
  },
  "search": {
    "searching": "検索中..."
  },
  "podcasts": {
    "categories": {
      "all": "すべて",
      "general": "一般",
      "news": "ニュース",
      "politics": "政治",
      "tech": "テック",
      "business": "ビジネス",
      "jewish": "ユダヤ",
      "entertainment": "エンターテインメント",
      "sports": "スポーツ",
      "history": "歴史",
      "educational": "教育"
    }
  },
  "profile": {
    "email": "メール",
    "notifications": "通知",
    "devices": {
      "minutesAgo_one": "{{count}}分前",
      "minutesAgo_other": "{{count}}分前",
      "hoursAgo_one": "{{count}}時間前",
      "hoursAgo_other": "{{count}}時間前",
      "daysAgo_one": "{{count}}日前",
      "daysAgo_other": "{{count}}日前"
    }
  },
  "errors": {
    "offline": "オフラインです。インターネット接続を確認してください。"
  },
  "footer": {
    "apps": {
      "title": "アプリを入手",
      "ios": "App Store",
      "android": "Google Play",
      "tvos": "Apple TV"
    },
    "social": {
      "title": "フォロー",
      "facebook": "Facebook",
      "twitter": "Twitter",
      "instagram": "Instagram",
      "youtube": "YouTube"
    },
    "privacyPolicy": "プライバシーポリシー"
  },
  "plans": {
    "basic": {
      "name": "ベーシック",
      "features": [
        "すべてのVODコンテンツ",
        "ラジオ＆ポッドキャスト",
        "1デバイスで視聴",
        "SD画質"
      ],
      "notIncluded": [
        "ライブチャンネル",
        "AIアシスタント",
        "オフライン視聴"
      ]
    },
    "premium": {
      "name": "プレミアム",
      "features": [
        "すべてのVODコンテンツ",
        "ライブチャンネル",
        "ラジオ＆ポッドキャスト",
        "スマートAIアシスタント",
        "2デバイスで視聴",
        "HD画質"
      ],
      "notIncluded": [
        "オフライン視聴",
        "ファミリープロフィール"
      ]
    },
    "family": {
      "name": "ファミリー",
      "features": [
        "すべてのVODコンテンツ",
        "ライブチャンネル",
        "ラジオ＆ポッドキャスト",
        "スマートAIアシスタント",
        "4デバイスで視聴",
        "4K画質",
        "5つのファミリープロフィール",
        "オフライン用ダウンロード"
      ],
      "notIncluded": []
    }
  },
  "judaism": {
    "items": "アイテム",
    "empty": "コンテンツがありません",
    "emptyHint": "別のカテゴリをお試しください",
    "dashboard": "ユダヤ教ダッシュボード",
    "categories": {
      "news": "ユダヤニュース",
      "community": "コミュニティ"
    },
    "shabbat": {
      "title": "シャバットタイム"
    }
  },
  "chatbot": {
    "suggestions": {
      "whatToWatch": "今日は何を見る？",
      "israeliMovies": "おすすめのイスラエル映画",
      "whatsOnNow": "今何が放送中？",
      "popularPodcasts": "人気のポッドキャスト"
    }
  },
  "support": {
    "faq": {
      "title": "よくある質問",
      "loading": "FAQを読み込み中...",
      "loadError": "FAQの読み込みに失敗しました",
      "empty": "このカテゴリにFAQはありません",
      "categories": {
        "all": "すべてのトピック",
        "general": "一般",
        "billing": "請求",
        "technical": "技術",
        "features": "機能"
      }
    }
  },
  "admin": {
    "brand": "Bayit+ 管理",
    "backToApp": "アプリに戻る",
    "refunds": {
      "title": "返金管理",
      "subtitle": "返金リクエストを処理",
      "pending": "保留中",
      "approved": "承認済み",
      "rejected": "却下",
      "processed": "処理済み",
      "requestDate": "リクエスト日",
      "amount": "金額",
      "reason": "理由",
      "user": "ユーザー",
      "approve": "承認",
      "reject": "却下",
      "process": "処理"
    },
    "plans": {
      "createButton": "新規プラン作成",
      "subscribersLabel": "購読者",
      "intervals": {
        "month": "月額",
        "year": "年額"
      },
      "trialDays": "トライアル日数",
      "modal": {
        "create": "新規プラン",
        "edit": "プランを編集"
      },
      "form": {
        "name": "プラン名",
        "nameEn": "名前（英語）",
        "nameHe": "名前（ヘブライ語）",
        "price": "価格",
        "interval": "請求間隔",
        "trialDays": "トライアル日数",
        "features": "機能（1行に1つ）",
        "active": "アクティブ"
      },
      "errors": {
        "nameRequired": "プラン名は必須です",
        "priceRequired": "価格は必須です"
      },
      "confirmDelete": "このプランを削除しますか？この操作は元に戻せません。"
    },
    "emailCampaigns": {
      "title": "メールキャンペーン",
      "subtitle": "メールマーケティングを管理"
    },
    "campaignEdit": {
      "title": "キャンペーンを編集",
      "subtitle": "キャンペーン設定を更新"
    },
    "dashboard": {
      "title": "ダッシュボード",
      "subtitle": "システム概要",
      "users": "ユーザー",
      "subscribers": "購読者",
      "revenue": "収益",
      "content": "コンテンツ",
      "totalUsers": "総ユーザー数",
      "activeSubscriptions": "アクティブな購読",
      "monthlyRevenue": "月間収益",
      "totalContent": "総コンテンツ",
      "recentUsers": "最近のユーザー"
    },
    "common": {
      "save": "保存",
      "cancel": "キャンセル",
      "delete": "削除",
      "edit": "編集",
      "add": "追加",
      "search": "検索",
      "filter": "フィルタ",
      "loading": "読み込み中...",
      "noResults": "結果がありません",
      "confirmDelete": "削除を確認",
      "actions": "アクション"
    },
    "stats": {
      "totalUsers": "総ユーザー数",
      "activeUsers": "アクティブユーザー",
      "newToday": "今日の新規",
      "newThisWeek": "今週の新規",
      "totalRevenue": "総収益",
      "revenueToday": "今日の収益",
      "revenueMonth": "月間収益",
      "arpu": "ARPU",
      "activeSubscriptions": "アクティブな購読",
      "churnRate": "解約率"
    },
    "actions": {
      "save": "保存",
      "cancel": "キャンセル",
      "delete": "削除",
      "edit": "編集",
      "view": "表示",
      "create": "作成",
      "refresh": "更新",
      "export": "エクスポート",
      "import": "インポート"
    },
    "auditActions": {
      "create": "作成",
      "update": "更新",
      "delete": "削除",
      "login": "ログイン",
      "logout": "ログアウト"
    },
    "placeholder": {
      "search": "検索...",
      "email": "メールアドレス",
      "name": "名前",
      "amount": "金額"
    },
    "titles": {
      "dashboard": "ダッシュボード",
      "users": "ユーザー",
      "content": "コンテンツ",
      "subscriptions": "購読",
      "settings": "設定",
      "analytics": "分析"
    },
    "nav": {
      "dashboard": "ダッシュボード",
      "users": "ユーザー",
      "content": "コンテンツ",
      "subscriptions": "購読",
      "marketing": "マーケティング",
      "settings": "設定",
      "analytics": "分析"
    },
    "liveQuotas": {
      "title": "ライブクォータ",
      "subtitle": "リアルタイム使用制限を監視",
      "current": "現在の使用",
      "limit": "制限",
      "reset": "リセット日",
      "unlimited": "無制限"
    },
    "featured": {
      "title": "注目コンテンツ",
      "subtitle": "ホームページのカルーセルを管理",
      "add": "注目を追加",
      "remove": "注目を解除",
      "order": "順序",
      "active": "アクティブ"
    },
    "content": {
      "subtitle": "映画、シリーズ、その他のコンテンツを管理",
      "importFree": "無料コンテンツをインポート",
      "searchPlaceholder": "コンテンツを検索...",
      "emptyMessage": "コンテンツが見つかりません",
      "confirmDelete": "このコンテンツを削除しますか？",
      "confirmDeleteSingle": "「{{title}}」を削除しますか？",
      "confirmBatchDelete": "{{count}}件のアイテムを削除しますか？",
      "batchDeleteSuccess": "{{count}}件のアイテムを削除しました",
      "batchDeletePartial": "{{success}}件を削除、{{failed}}件が失敗",
      "selectedItems": "{{count}}件選択済み",
      "batchFeature": "注目に追加",
      "batchUnfeature": "注目を解除",
      "import": {
        "title": "コンテンツをインポート",
        "movies": "映画をインポート",
        "series": "シリーズをインポート"
      },
      "movies": "映画",
      "series": "シリーズ",
      "audiobooks": "オーディオブック",
      "podcasts": "ポッドキャスト",
      "filters": {
        "all": "すべて",
        "published": "公開済み",
        "draft": "下書き",
        "featured": "注目"
      },
      "showOnlyWithSubtitles": "字幕付きのみ表示",
      "status": {
        "published": "公開済み",
        "draft": "下書き",
        "archived": "アーカイブ済み"
      },
      "columns": {
        "title": "タイトル",
        "type": "タイプ",
        "category": "カテゴリ",
        "status": "ステータス",
        "featured": "注目",
        "created": "作成日",
        "actions": "アクション"
      },
      "validation": {
        "titleRequired": "タイトルは必須です",
        "urlRequired": "URLは必須です"
      },
      "episodes_one": "{{count}}エピソード",
      "episodes_other": "{{count}}エピソード",
      "toggleCarousel": "カルーセルを切り替え",
      "editor": {
        "title": "コンテンツエディタ",
        "general": "一般情報",
        "media": "メディア",
        "metadata": "メタデータ"
      },
      "categoryPicker": {
        "title": "カテゴリを選択",
        "search": "カテゴリを検索..."
      },
      "streamUrlInput": {
        "label": "ストリームURL",
        "placeholder": "ストリームURLを入力"
      },
      "batchMerge": "一括マージ",
      "mergeContent": "コンテンツをマージ",
      "selectItemToKeep": "保持するアイテムを選択",
      "removeAction": "削除アクション",
      "removeActionUnpublish": "非公開にする",
      "removeActionDelete": "完全に削除",
      "unpublishDescription": "このアイテムを非公開にします",
      "deleteWarning": "警告: この操作は元に戻せません",
      "mergeReason": "マージ理由",
      "mergeReasonPlaceholder": "マージの理由を入力...",
      "mergeReasonTooShort": "理由は10文字以上必要です",
      "confirmMerge": "マージを確認",
      "itemWillBeKept": "このアイテムは保持されます",
      "itemsWillBeRemoved": "このアイテムは削除されます",
      "itemsWillBeRemoved_plural": "これらのアイテムは削除されます",
      "mergeSuccess": "マージに成功しました",
      "mergeFailed": "マージに失敗しました",
      "merge": {
        "title": "コンテンツをマージ",
        "selectBase": "ベースアイテムを選択",
        "selectMerge": "マージするアイテムを選択"
      }
    },
    "billing": {
      "title": "請求",
      "subtitle": "収益と支払いを追跡",
      "revenue": "収益",
      "today": "今日",
      "thisWeek": "今週",
      "thisMonth": "今月",
      "thisYear": "今年",
      "metrics": "主要指標",
      "totalTransactions": "総取引数",
      "avgTransaction": "平均取引",
      "pendingRefunds": "保留中の返金",
      "refundRate": "返金率",
      "retention": "リテンション",
      "retentionRate": "リテンション率",
      "churnRate": "解約率",
      "atRiskUsers": "リスクのあるユーザー",
      "churnedUsers": "解約したユーザー",
      "quickLinks": "クイックリンク"
    },
    "settings": {
      "title": "設定",
      "subtitle": "システムパラメータを設定",
      "saveChanges": "変更を保存",
      "generalSettings": "一般設定",
      "supportEmail": "サポートメール",
      "defaultPlan": "デフォルトプラン",
      "termsUrl": "利用規約URL",
      "privacyUrl": "プライバシーポリシーURL",
      "userSettings": "ユーザー設定",
      "maxDevices": "アカウントあたりの最大デバイス数",
      "trialDays": "トライアル期間（日）",
      "maintenanceMode": "メンテナンスモード",
      "maintenanceModeDesc": "有効にすると、システムはユーザーからアクセスできなくなります",
      "featureFlags": "機能フラグ",
      "systemActions": "システムアクション",
      "clearCache": "キャッシュをクリア",
      "resetAnalytics": "分析をリセット",
      "actionsWarning": "これらのアクションはシステムのパフォーマンスに影響を与える可能性があります。",
      "savingSuccess": "設定が正常に保存されました",
      "confirmClearCache": "キャッシュをクリアしますか？",
      "cacheCleared": "キャッシュがクリアされました",
      "confirmResetAnalytics": "分析データをリセットしますか？",
      "analyticsReset": "分析データがリセットされました",
      "featureFlagLabels": {
        "new_player": "新しいプレーヤー",
        "live_chat": "ライブチャット",
        "downloads": "ダウンロード",
        "watch_party": "ウォッチパーティー",
        "voice_search": "音声検索",
        "ai_recommendations": "AIレコメンデーション"
      }
    },
    "users": {
      "title": "ユーザー",
      "subtitle": "ユーザーとアカウントを管理",
      "addUser": "ユーザーを追加",
      "status": {
        "active": "アクティブ",
        "inactive": "非アクティブ",
        "blocked": "ブロック"
      },
      "filters": {
        "all": "すべて",
        "active": "アクティブ",
        "inactive": "非アクティブ",
        "blocked": "ブロック"
      },
      "columns": {
        "name": "名前",
        "role": "役割",
        "subscription": "購読",
        "noSubscription": "購読なし",
        "status": "ステータス",
        "created": "作成日",
        "actions": "アクション"
      },
      "confirmDelete": "ユーザーを削除",
      "confirmDeleteMessage": "{{name}}を削除しますか？",
      "resetPassword": "パスワードをリセット",
      "block": "ブロック",
      "unban": "ブロック解除"
    },
    "campaigns": {
      "title": "キャンペーン",
      "subtitle": "クーポンコードと割引を管理",
      "expired": "期限切れ",
      "status": {
        "active": "アクティブ",
        "inactive": "非アクティブ"
      },
      "columns": {
        "name": "名前",
        "discount": "割引",
        "usage": "使用回数",
        "validUntil": "有効期限",
        "status": "ステータス",
        "actions": "アクション"
      }
    },
    "subscriptions": {
      "title": "購読",
      "subtitle": "購読者を表示・管理",
      "status": {
        "active": "アクティブ",
        "paused": "一時停止",
        "cancelled": "キャンセル済み",
        "expired": "期限切れ"
      },
      "columns": {
        "user": "ユーザー",
        "plan": "プラン",
        "price": "価格",
        "nextBilling": "次回請求日",
        "status": "ステータス"
      }
    }
  }
};

deepMerge(ja, translations);

fs.writeFileSync('ja.json', JSON.stringify(ja, null, 2) + '\n');
console.log('Part 7 Japanese translations merged successfully!');
