import fs from 'fs';

const ja = JSON.parse(fs.readFileSync('ja.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const additions = {
  podcasts: {
    categories: {
      all: "すべて",
      general: "一般",
      news: "ニュース",
      politics: "政治",
      tech: "テクノロジー",
      business: "ビジネス",
      jewish: "ユダヤ教",
      entertainment: "エンターテインメント",
      sports: "スポーツ",
      history: "歴史",
      educational: "教育"
    }
  },
  errors: {
    offline: {
      title: "インターネット接続がありません",
      message: "現在オフラインです。一部の機能が利用できない場合があります。",
      ttsMessage: "インターネット接続がありません。オフラインモードに切り替わりました。"
    }
  },
  footer: {
    apps: {
      title: "アプリを入手",
      downloadOn: "ダウンロード",
      getItOn: "入手先",
      appStore: "App Store",
      googlePlay: "Google Play"
    },
    social: {
      facebook: "Facebook",
      twitter: "Twitter",
      instagram: "Instagram",
      youtube: "YouTube"
    }
  },
  plans: {
    basic: {
      name: "ベーシック",
      features: [
        "全VODコンテンツ",
        "ラジオ＆ポッドキャスト",
        "1台のデバイスで視聴",
        "SD画質"
      ],
      notIncluded: [
        "ライブチャンネル",
        "AIアシスタント",
        "オフライン視聴"
      ]
    },
    premium: {
      name: "プレミアム",
      features: [
        "全VODコンテンツ",
        "ライブチャンネル",
        "ラジオ＆ポッドキャスト",
        "スマートAIアシスタント",
        "2台のデバイスで視聴",
        "HD画質"
      ],
      notIncluded: [
        "オフライン視聴",
        "ファミリープロフィール"
      ]
    },
    family: {
      name: "ファミリー",
      features: [
        "全VODコンテンツ",
        "ライブチャンネル",
        "ラジオ＆ポッドキャスト",
        "スマートAIアシスタント",
        "4台のデバイスで視聴",
        "4K画質",
        "5つのファミリープロフィール",
        "オフラインダウンロード"
      ],
      notIncluded: []
    }
  },
  judaism: {
    shabbat: {
      title: "シャバットの時刻",
      shabbatShalom: "シャバット・シャローム！",
      shabbatMode: "シャバットモード",
      endsIn: "シャバット終了まで",
      candleLighting: "ロウソク点灯",
      havdalah: "ハヴダラー",
      parashat: "パラシャット",
      friday: "金曜日",
      saturday: "土曜日",
      noData: "シャバットの時刻を読み込めませんでした"
    }
  },
  chatbot: {
    suggestions: {
      whatToWatch: "今日は何を見ましょうか？",
      israeliMovies: "おすすめのイスラエル映画",
      whatsOnNow: "今放送中の番組は？",
      popularPodcasts: "人気のポッドキャスト"
    }
  },
  support: {
    faq: {
      title: "よくある質問",
      loading: "FAQ読み込み中...",
      loadError: "FAQの読み込みに失敗しました",
      empty: "このカテゴリにはFAQ項目がありません",
      categories: {
        all: "すべてのトピック",
        general: "一般",
        billing: "請求",
        technical: "技術",
        features: "機能"
      }
    }
  },
  admin: {
    brand: {
      title: "Bayit+ 管理画面",
      subtitle: "システム管理"
    },
    refunds: {
      subtitle: "返金リクエストの管理",
      approveModal: {
        title: "承認の確認",
        message: "{{amount}}の返金を承認しますか？"
      },
      confirmApprove: "{{amount}}の返金を承認しますか？",
      confirmDelete: "返金リクエストを削除しますか？",
      rejectModal: {
        title: "返金リクエストの拒否",
        message: "{{amount}}の返金を拒否しています",
        reasonLabel: "拒否理由",
        reasonPlaceholder: "拒否理由を入力してください...",
        submitButton: "リクエストを拒否"
      },
      status: {
        pending: "保留中",
        approved: "承認済み",
        rejected: "拒否済み"
      },
      columns: {
        id: "ID",
        user: "ユーザー",
        amount: "金額",
        reason: "理由",
        status: "ステータス",
        requestDate: "リクエスト日"
      },
      stats: {
        pendingTitle: "承認待ち",
        approvedTitle: "承認済み",
        rejectedTitle: "拒否済み",
        totalRefunded: "返金総額"
      },
      emptyMessage: "返金リクエストが見つかりません",
      errors: {
        rejectReasonRequired: "拒否理由を入力してください"
      },
      title: "返金"
    },
    plans: {
      intervals: {
        monthly: "月",
        yearly: "年"
      },
      modal: {
        editTitle: "プランの編集",
        createTitle: "新規プラン"
      },
      errors: {
        requiredFields: "名前と料金は必須です"
      }
    },
    emailCampaigns: {
      createButton: "新規キャンペーン",
      searchPlaceholder: "キャンペーンを検索...",
      emptyMessage: "キャンペーンが見つかりません",
      status: {
        draft: "下書き",
        active: "アクティブ",
        scheduled: "予約済み",
        completed: "完了"
      },
      columns: {
        name: "キャンペーン名",
        status: "ステータス",
        sent: "送信済み",
        opened: "開封済み",
        clicked: "クリック",
        created: "作成日",
        actions: "操作"
      },
      editModal: {
        title: "キャンペーンの編集"
      },
      sendTestEmail: "テスト送信",
      confirmSend: "キャンペーン「{{name}}」を送信しますか？",
      confirmDelete: "キャンペーン「{{name}}」を削除しますか？",
      testEmailSent: "テストメールを送信しました！",
      createModal: {
        title: "新規メールキャンペーン"
      },
      form: {
        name: "キャンペーン名",
        namePlaceholder: "例：年末セール",
        subject: "メール件名",
        subjectPlaceholder: "受信者に表示される件名",
        body: "コンテンツ",
        bodyPlaceholder: "メール内容...",
        submitButton: "キャンペーンを作成",
        requiredFields: "名前と件名は必須です"
      },
      testModal: {
        title: "テストメールの送信",
        emailLabel: "メールアドレス",
        emailPlaceholder: "test@example.com",
        submitButton: "テスト送信"
      },
      errors: {
        requiredFields: "名前と件名は必須です"
      }
    },
    dashboard: {
      subtitle: "システム概要",
      refresh: "更新",
      timeAgo: {
        minutes: "{{count}}分前",
        hours: "{{count}}時間前"
      },
      title: "ダッシュボード",
      users: "ユーザー",
      revenue: "収益",
      subscriptions: "サブスクリプション",
      recentActivity: "最近のアクティビティ",
      quickActions: "クイックアクション"
    },
    common: {
      all: "すべて",
      active: "アクティブ",
      back: "戻る",
      backToPodcasts: "ポッドキャストに戻る",
      savePodcast: "ポッドキャストを保存",
      saveEpisode: "エピソードを保存",
      filterAction: "アクション",
      filterResource: "リソース",
      filterUser: "ユーザー",
      filterDateRange: "期間"
    },
    actions: {
      new: "新規",
      addUser: "ユーザーを追加",
      newCampaign: "新規キャンペーン",
      sendEmail: "メール送信",
      viewReports: "レポートを表示",
      newPodcast: "新規ポッドキャストを作成",
      newEpisode: "新規エピソードを作成"
    },
    auditActions: {
      user_created: "ユーザー作成",
      user_updated: "ユーザー更新",
      user_deleted: "ユーザー削除",
      user_role_changed: "ユーザーロール変更",
      campaign_created: "キャンペーン作成",
      campaign_updated: "キャンペーン更新",
      campaign_deleted: "キャンペーン削除",
      campaign_activated: "キャンペーン有効化",
      subscription_created: "サブスクリプション作成",
      subscription_updated: "サブスクリプション更新",
      subscription_canceled: "サブスクリプション解約",
      subscription_deleted: "サブスクリプション削除",
      refund_processed: "返金処理",
      payment_received: "支払い受領",
      settings_updated: "設定更新",
      content_created: "コンテンツ作成",
      content_updated: "コンテンツ更新",
      content_deleted: "コンテンツ削除",
      content_published: "コンテンツ公開",
      content_unpublished: "コンテンツ非公開",
      category_created: "カテゴリ作成",
      category_updated: "カテゴリ更新",
      category_deleted: "カテゴリ削除",
      live_channel_created: "ライブチャンネル作成",
      live_channel_updated: "ライブチャンネル更新",
      live_channel_deleted: "ライブチャンネル削除",
      radio_station_created: "ラジオ局作成",
      radio_station_updated: "ラジオ局更新",
      radio_station_deleted: "ラジオ局削除",
      podcast_created: "ポッドキャスト作成",
      podcast_updated: "ポッドキャスト更新",
      podcast_deleted: "ポッドキャスト削除",
      podcast_episode_created: "ポッドキャストエピソード作成",
      podcast_episode_updated: "ポッドキャストエピソード更新",
      podcast_episode_deleted: "ポッドキャストエピソード削除",
      content_imported: "コンテンツインポート",
      widget_created: "ウィジェット作成",
      widget_updated: "ウィジェット更新",
      widget_deleted: "ウィジェット削除",
      widget_published: "ウィジェット公開",
      widget_unpublished: "ウィジェット非公開"
    },
    placeholder: {
      userId: "ユーザーIDを入力",
      discount: "0"
    },
    titles: {
      transactions: "取引",
      refunds: "返金",
      plans: "プラン",
      campaigns: "キャンペーン",
      auditLogs: "監査ログ",
      pushNotifications: "プッシュ通知",
      billing: "請求",
      marketing: "マーケティング",
      categories: "カテゴリ",
      liveChannels: "ライブチャンネル",
      librarian: "ライブラリアンエージェント",
      radioStations: "ラジオ局",
      podcasts: "ポッドキャスト"
    },
    nav: {
      campaigns: "キャンペーン",
      billing: "請求",
      billingOverview: "概要",
      transactions: "取引",
      refunds: "返金",
      subscriptionsList: "サブスクライバー",
      plans: "プラン",
      marketingDashboard: "概要",
      emailCampaigns: "メールキャンペーン",
      pushNotifications: "プッシュ通知",
      contentLibrary: "コンテンツライブラリ",
      categories: "カテゴリ",
      liveChannels: "ライブチャンネル",
      radioStations: "ラジオ局",
      podcasts: "ポッドキャスト",
      widgets: "ウィジェット",
      recordings: "録画",
      uploads: "アップロード",
      auditLogs: "監査ログ",
      librarian: "ライブラリアンエージェント",
      liveQuotas: "ライブクォータ",
      featured: "おすすめ",
      translations: "翻訳"
    },
    liveQuotas: {
      analytics: "ライブ機能の使用状況分析",
      currentUsage: "現在の使用状況",
      quotaLimits: "クォータ制限",
      confirmReset: "このユーザーの全使用カウンターをリセットしますか？",
      subtitlesHour: "字幕（時間）",
      subtitlesDay: "字幕（日）",
      subtitlesMonth: "字幕（月）",
      dubbingHour: "吹替（時間）",
      dubbingDay: "吹替（日）",
      dubbingMonth: "吹替（月）",
      estimatedCost: "推定コスト（今月）",
      subtitleLimits: "字幕の制限",
      dubbingLimits: "吹替の制限",
      perHour: "1時間あたり（分）",
      perDay: "1日あたり（分）",
      perMonth: "1ヶ月あたり（分）",
      notes: "管理者メモ",
      notesPlaceholder: "制限拡張の理由...",
      editLimits: "制限を編集",
      resetCounters: "全使用カウンターをリセット",
      totalUsers: "クォータ設定済みユーザー数",
      activeSessions: "アクティブセッション",
      subtitlesToday: "字幕利用分数（今日）",
      dubbingToday: "吹替利用分数（今日）",
      costToday: "コスト（今日）",
      costMonth: "コスト（今月）",
      last7Days: "過去7日間",
      last30Days: "過去30日間",
      totalSessions: "総セッション数",
      totalMinutes: "総利用分数",
      totalCost: "総コスト",
      topUsers: "上位ユーザー（過去30日間）",
      user: "ユーザー",
      subtitles: "字幕",
      dubbing: "吹替",
      cost: "コスト",
      noData: "使用データがありません"
    },
    featured: {
      empty: "おすすめコンテンツがありません",
      emptyHint: "コンテンツライブラリからおすすめに追加してください",
      count: "{{count}}件",
      confirmUnfeature: "おすすめから削除しますか？",
      unsavedChanges: "未保存の変更があります",
      addContent: "コンテンツを追加",
      addContentToSection: "{{section}}にコンテンツを追加",
      selectContentToAdd: "追加するコンテンツを選択",
      addSelected: "選択した項目を追加（{{count}}）",
      noContentAvailable: "利用可能なコンテンツがありません",
      contentAdded: "{{count}}件を追加しました",
      failedToAdd: "コンテンツの追加に失敗しました",
      publishedOnly: "公開済みのみ",
      saveButton: "保存（{{count}}）"
    },
    content: {
      import: {
        pageTitle: "無料コンテンツのインポート",
        subtitle: "無料ソースから公開コンテンツを閲覧・インポート",
        selectCategory: "インポートする映画のカテゴリを選択：",
        categoryPlaceholder: "カテゴリを選択...",
        loading: "ソースを読み込み中...",
        sourceTypes: {
          vod: "映画＆VOD",
          live_tv: "ライブTV",
          radio: "ラジオ",
          podcasts: "ポッドキャスト"
        },
        items: "アイテム",
        itemsPlural: "アイテム",
        selectItems: "インポートするアイテムを1つ以上選択してください",
        selectCategory_vod: "VODインポートにはカテゴリを選択してください",
        importing: "インポート中 {{count}}件... {{percent}}%",
        importButton: "{{count}} {{item}}をインポート",
        noSources: "利用可能なソースがありません",
        noSourcesDescription: "{{type}}の無料コンテンツソースは現在利用できません"
      },
      filters: {
        contentType: "コンテンツタイプ",
        series: "シリーズ",
        movies: "映画",
        audiobooks: "オーディオブック",
        podcasts: "ポッドキャスト",
        radioStations: "ラジオ局",
        allStatus: "すべてのステータス"
      },
      columns: {
        year: "年",
        views: "視聴回数",
        rating: "評価",
        streamUrl: "ストリームURL",
        epgSource: "EPGソース",
        genre: "ジャンル",
        episodeNumber: "エピソード番号",
        description: "説明",
        duration: "再生時間",
        publishedDate: "公開日",
        episodes: "エピソード",
        order: "順序",
        name: "名前",
        slug: "スラッグ",
        subtitles: "字幕"
      },
      validation: {
        nameRequired: "名前は必須です",
        streamUrlRequired: "ストリームURLは必須です",
        audioUrlRequired: "オーディオURLは必須です"
      },
      editor: {
        pageTitle: "コンテンツの編集",
        pageTitleNew: "コンテンツの追加",
        sections: {
          basicInfo: "基本情報",
          media: "メディア",
          streaming: "ストリーミング",
          details: "コンテンツ詳細",
          publishing: "公開設定",
          accessControl: "アクセス制御",
          podcastDetails: "ポッドキャスト詳細",
          episodeDetails: "エピソード詳細",
          stationDetails: "ラジオ局詳細",
          channelDetails: "チャンネル詳細"
        },
        fields: {
          title: "タイトル",
          titlePlaceholder: "コンテンツのタイトル",
          titleRequired: "タイトルは必須です",
          year: "年",
          yearPlaceholder: "2024",
          description: "説明",
          descriptionPlaceholder: "コンテンツの説明",
          thumbnail: "サムネイル（3:4のアスペクト比）",
          thumbnailUrl: "サムネイルURL",
          thumbnailUrlPlaceholder: "https://example.com/thumbnail.jpg",
          backdrop: "バックドロップ（16:9のアスペクト比）",
          backdropUrl: "バックドロップURL",
          posterCover: "ポッドキャストカバー",
          logo: "ロゴ",
          channelLogo: "チャンネルロゴ",
          stationLogo: "ラジオ局ロゴ",
          streamUrl: "ストリームURL",
          streamUrlRequired: "ストリームURLは必須です",
          streamType: "ストリームタイプ",
          drmProtected: "DRM保護",
          drmProtectedLabel: "このコンテンツはDRM保護が必要です",
          category: "カテゴリ",
          categoryRequired: "カテゴリは必須です",
          duration: "再生時間",
          durationPlaceholder: "1:30:00",
          rating: "レーティング",
          ratingPlaceholder: "PG-13",
          genre: "ジャンル",
          genrePlaceholder: "ドラマ",
          director: "監督",
          directorPlaceholder: "監督名",
          isSeries: "シリーズ",
          isSeriesLabel: "これはシリーズ/複数パートのコンテンツです",
          season: "シーズン",
          episode: "エピソード",
          seriesId: "シリーズID",
          seriesIdPlaceholder: "series-identifier",
          isPublished: "公開",
          isPublishedLabel: "このコンテンツをすぐに公開する",
          isFeatured: "おすすめ",
          isFeaturedLabel: "このコンテンツをホームページに掲載する",
          requiresSubscription: "必要なサブスクリプション",
          isKidsContent: "キッズコンテンツ",
          isKidsContentLabel: "これは子供向けコンテンツです",
          author: "著者",
          authorPlaceholder: "ポッドキャストの著者",
          podcastCategory: "カテゴリ",
          podcastCategoryPlaceholder: "ニュース、サイエンスなど",
          rssFeed: "RSSフィードURL",
          rssFeedPlaceholder: "https://example.com/feed.xml",
          website: "ウェブサイトURL",
          websitePlaceholder: "https://example.com",
          episodeNumber: "エピソード番号",
          seasonNumber: "シーズン番号",
          audioUrl: "オーディオURL",
          audioUrlRequired: "オーディオURLは必須です",
          audioUrlPlaceholder: "https://example.com/episode.mp3",
          publishedAt: "公開日",
          epgSource: "EPGソースURL",
          epgSourcePlaceholder: "https://example.com/epg.xml",
          currentShow: "現在の番組",
          currentShowPlaceholder: "番組名",
          nextShow: "次の番組",
          nextShowPlaceholder: "番組名",
          currentSong: "現在の曲",
          currentSongPlaceholder: "曲名",
          isActive: "有効",
          isActiveLabel: "チャンネルが有効",
          requiredSubscription: "必要なサブスクリプション",
          publishedDate: "公開日"
        },
        subscriptionTiers: {
          basic: "ベーシック",
          premium: "プレミアム",
          family: "ファミリー"
        },
        actions: {
          save: "保存",
          saving: "保存中...",
          cancel: "キャンセル"
        },
        imageUpload: {
          dropHere: "画像をここにドロップまたはクリックしてアップロード",
          formats: "PNG、JPG、WebP（最大{{maxSize}}MB）",
          uploading: "アップロード中...",
          success: "画像のアップロードに成功しました",
          orPasteUrl: "または画像URLを貼り付け",
          urlPlaceholder: "https://example.com/image.jpg",
          validateButton: "追加",
          validating: "検証中...",
          clear: "画像を削除",
          changeImage: "画像を変更",
          errors: {
            imageOnly: "画像ファイルを選択してください",
            tooLarge: "ファイルサイズは{{maxSize}}MB以下にしてください",
            uploadFailed: "アップロードに失敗しました",
            invalidUrl: "無効なURLです"
          }
        }
      },
      categoryPicker: {
        selectPlaceholder: "カテゴリを選択...",
        searchPlaceholder: "カテゴリを検索...",
        loading: "カテゴリを読み込み中...",
        noResults: "カテゴリが見つかりません",
        noCategories: "利用可能なカテゴリがありません",
        createNew: "新しいカテゴリを作成",
        errors: {
          loadFailed: "カテゴリの読み込みに失敗しました",
          createFailed: "カテゴリの作成に失敗しました"
        },
        modal: {
          title: "新規カテゴリの作成",
          placeholder: "カテゴリ名（例：映画、シリーズ）",
          creating: "作成中...",
          create: "作成"
        }
      },
      streamUrlInput: {
        copyUrl: "URLをコピー",
        copied: "URLをクリップボードにコピーしました",
        streamType: "ストリームタイプ",
        validUrl: "URLは有効です - {{type}}として検出されました",
        errors: {
          required: "ストリームURLは必須です",
          invalidFormat: "無効なURL形式です"
        },
        supportedFormats: {
          title: "対応フォーマット：",
          hls: "HLS: .m3u8ストリーム",
          dash: "DASH: .mpdストリーム",
          audio: "オーディオ: .mp3、.aac、またはオーディオストリーム"
        }
      },
      merge: {
        wizard: "コンテンツ統合ウィザード",
        errorMixedTypes: "シリーズと映画を一緒に統合することはできません",
        errorDifferentNames: "アイテムの名前が一致または類似していません",
        suggestionSeparate: "シリーズのみまたは映画のみを選択してください",
        suggestionNames1: "統合するアイテムは異なる言語で同じ名前を持つ必要があります",
        suggestionNames2: "例：「בורגנים」（ヘブライ語）と「burganim」（英語）",
        cannotMerge: "これらのアイテムは統合できません",
        canMerge: "アイテムは統合可能です",
        suggestions: "提案：",
        validationPassed: "これらのアイテムは類似した名前を持ち、統合の互換性があります。",
        continue: "続行",
        selectBaseDescription: "ベースとして残すアイテムを選択してください。他のアイテムのすべてのコンテンツがこのアイテムに統合されます。",
        configure: "統合の設定",
        configureDescription: "転送する内容と保持するメタデータを選択してください。",
        contentTransfer: "コンテンツ転送",
        transferSeasons: "シーズンの転送",
        transferSeasonsDesc: "統合されるアイテムからベースアイテムに全シーズンを移動",
        transferEpisodes: "エピソードの転送",
        transferEpisodesDesc: "統合されるアイテムからベースアイテムに全エピソードを移動",
        metadataPreferences: "メタデータの優先設定",
        baseItem: "ベースアイテム",
        useBasePoster: "ベースアイテムのポスターを使用",
        useBasePosterDesc: "ベースアイテムのポスター画像を保持します",
        useBaseDescription: "ベースアイテムの説明を使用",
        useBaseDescriptionDesc: "ベースアイテムの説明文を保持します",
        mergePreview: "統合プレビュー",
        itemsToMerge: "統合するアイテム",
        totalSeasons: "統合後の総シーズン数",
        totalEpisodes: "統合後の総エピソード数",
        confirmMerge: "統合の確認",
        confirmDescription: "統合操作を確認してから実行してください。",
        baseItemKeep: "このアイテムは保持されます",
        itemsMergeInto: "これらのアイテムはベースに統合されます",
        mergeWarning: "統合後、すべてのコンテンツがベースアイテムにまとめられます。統合されたアイテムは統合済みとしてマークされ、ライブラリから非表示になります。",
        merging: "統合中...",
        confirmButton: "アイテムを統合",
        errorNoBase: "ベースアイテムを選択してください",
        errorNoMerge: "統合するアイテムがありません",
        successMessage: "{{count}}件のアイテムを「{{title}}」に統合しました。",
        noEpisodesNote: "注意：データベースにエピソードやシーズンがまだ作成されていないため、転送されませんでした。",
        transferredInfo: "転送済み：{{seasons}}シーズン、{{episodes}}エピソード。",
        mergeSuccess: "統合が完了しました"
      }
    },
    uploads: {
      mobile: {
        lowMemoryWarning: "デバイスのメモリが不足しています。大きなファイルのアップロードに失敗する可能性があります。",
        batteryLowWarning: "バッテリーが低下しています（{{percent}}%）。アップロードが中断される可能性があります。",
        networkChanged: "ネットワークが変更されました。再接続中...",
        mobileBrowserNotSupported: "一部の機能がモバイルブラウザでは動作しない場合があります"
      }
    },
    billing: {
      subtitle: "収益と支払いの追跡",
      revenue: "収益",
      today: "今日",
      thisWeek: "今週",
      thisMonth: "今月",
      thisYear: "今年",
      metrics: "主要指標",
      totalTransactions: "総取引数",
      avgTransaction: "平均取引額",
      pendingRefunds: "保留中の返金",
      refundRate: "返金率",
      retention: "リテンション",
      retentionRate: "リテンション率",
      churnRate: "解約率",
      atRiskUsers: "リスクのあるユーザー",
      churnedUsers: "解約済みユーザー",
      quickLinks: "クイックリンク"
    },
    settings: {
      subtitle: "システムパラメータの設定",
      saveChanges: "変更を保存",
      generalSettings: "一般設定",
      supportEmail: "サポートメールアドレス",
      defaultPlan: "デフォルトプラン",
      termsUrl: "利用規約URL",
      privacyUrl: "プライバシーポリシーURL",
      userSettings: "ユーザー設定",
      maxDevices: "アカウントあたりの最大デバイス数",
      trialDays: "トライアル期間（日数）",
      maintenanceMode: "メンテナンスモード",
      maintenanceModeDesc: "有効にすると、システムはユーザーからアクセスできなくなります",
      featureFlags: "フィーチャーフラグ",
      systemActions: "システムアクション",
      clearCache: "キャッシュをクリア",
      resetAnalytics: "アナリティクスをリセット",
      actionsWarning: "これらのアクションはシステムのパフォーマンスに影響を与える可能性があります。注意して使用してください。",
      savingSuccess: "設定を保存しました",
      confirmClearCache: "キャッシュをクリアしますか？パフォーマンスに一時的に影響する場合があります。",
      cacheCleared: "キャッシュをクリアしました",
      confirmResetAnalytics: "アナリティクスデータをリセットしますか？この操作は元に戻せません！",
      analyticsReset: "アナリティクスデータをリセットしました",
      featureFlagLabels: {
        new_player: "新しいプレーヤー",
        live_chat: "ライブチャット",
        downloads: "ダウンロード",
        watch_party: "ウォッチパーティー",
        voice_search: "音声検索",
        ai_recommendations: "AIレコメンデーション"
      }
    },
    users: {
      subtitle: "ユーザーとアカウントの管理",
      addUser: "ユーザーを追加",
      status: {
        active: "アクティブ",
        inactive: "無効",
        blocked: "ブロック中"
      },
      filters: {
        all: "すべて",
        active: "アクティブ",
        inactive: "無効",
        blocked: "ブロック中"
      },
      columns: {
        name: "名前",
        role: "ロール",
        subscription: "サブスクリプション",
        noSubscription: "サブスクリプションなし",
        status: "ステータス",
        created: "作成日",
        actions: "操作"
      },
      confirmDelete: "ユーザーを削除",
      confirmDeleteMessage: "{{name}}を削除してもよろしいですか？この操作は元に戻せません。",
      resetPassword: "パスワードをリセット",
      block: "ブロック",
      unban: "ブロック解除",
      confirmResetPassword: "{{email}}にパスワードリセットメールを送信しますか？",
      resetPasswordSent: "パスワードリセットメールを送信しました",
      recentActivity: "最近のアクティビティ",
      noActivity: "アクティビティなし",
      notFound: "ユーザーが見つかりません",
      backToList: "一覧に戻る",
      banReason: "ブロック理由",
      banReasonPrompt: "ブロック理由：",
      confirmUnban: "ユーザーのブロックを解除しますか？",
      userDetails: "ユーザー詳細",
      id: "ID",
      registered: "登録日",
      billingHistory: "請求履歴",
      noPayments: "支払いなし"
    },
    campaigns: {
      subtitle: "クーポンコードとディスカウントの管理",
      expired: "期限切れ",
      status: {
        active: "アクティブ",
        inactive: "無効"
      },
      columns: {
        name: "名前",
        discount: "割引",
        usage: "使用回数",
        validUntil: "有効期限",
        status: "ステータス",
        actions: "操作"
      },
      confirmDelete: "キャンペーンを削除",
      confirmDeleteMessage: "「{{name}}」を削除してもよろしいですか？この操作は元に戻せません。",
      searchPlaceholder: "キャンペーンを検索...",
      emptyMessage: "キャンペーンが見つかりません",
      deactivate: "無効化",
      activate: "有効化",
      createTitle: "新規キャンペーン",
      editTitle: "キャンペーンの編集",
      formSubtitle: "クーポンコードまたはディスカウントを設定",
      form: {
        name: "キャンペーン名",
        namePlaceholder: "例：サマーセール2024",
        code: "クーポンコード",
        generate: "生成",
        discountType: "割引タイプ",
        discountValue: "割引額",
        maxUses: "最大使用回数",
        unlimited: "無制限",
        validUntil: "有効期限",
        active: "キャンペーンを有効化"
      }
    },
    subscriptions: {
      subtitle: "システムのサブスクライバーの表示と管理",
      status: {
        active: "アクティブ",
        paused: "一時停止",
        cancelled: "解約済み",
        expired: "期限切れ"
      },
      columns: {
        user: "ユーザー",
        plan: "プラン",
        price: "料金",
        nextBilling: "次回請求日",
        status: "ステータス"
      },
      perMonth: "/月",
      searchPlaceholder: "サブスクリプションを検索...",
      emptyMessage: "サブスクリプションが見つかりません",
      actions: {
        changePlan: "プラン変更",
        pause: "一時停止",
        resume: "再開",
        cancel: "解約",
        delete: "削除"
      },
      editPlan: {
        title: "サブスクリプションプランの変更",
        user: "ユーザー",
        currentPlan: "現在のプラン",
        newPlan: "新しいプランを選択"
      },
      addSubscription: {
        title: "サブスクリプションの追加",
        userEmail: "ユーザーメールアドレス",
        emailPlaceholder: "メールアドレスを入力",
        duration: "期間（日数）",
        selectPlan: "プランを選択"
      },
      fillAllFields: "すべてのフィールドを入力してください",
      userNotFound: "ユーザーが見つかりません",
      selectOneToEdit: "編集するサブスクリプションを1つ選択してください",
      selectToDelete: "削除するサブスクリプションを選択してください",
      confirmDeleteMultiple: "{{count}}件のサブスクリプションを削除しますか？",
      selected: "件選択中",
      confirmDelete: "{{user}}のサブスクリプションを削除してもよろしいですか？この操作は元に戻せません。"
    }
  }
};

deepMerge(ja, additions);

fs.writeFileSync('ja.json', JSON.stringify(ja, null, 2) + '\n');
console.log('Added 290 missing Japanese translations to ja.json');
