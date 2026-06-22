# Connected Accounts Localization Strings

## Status

[OK] **COMPLETED:**
- English (en.json)
- Hebrew (he.json)
- Spanish (es.json)

⏳ **REMAINING:**
- French (fr.json)
- Italian (it.json)
- Chinese (zh.json)
- Hindi (hi.json)
- Tamil (ta.json)
- Bengali (bn.json)
- Japanese (ja.json)

---

## How to Add

Find the `"settings"` section in each JSON file and add these keys after `"termsOfService"` or before `"familyAndSafety"`.

---

## French (fr.json)

```json
"connectedAccounts": "Comptes Connectés",
"connectedAccountsDescription": "Gérez comment vous vous connectez à Bayit+. Vous pouvez lier plusieurs comptes pour un accès plus facile.",
"linkedAccounts": "Comptes Liés",
"linkNewAccount": "Lier un Nouveau Compte",
"noLinkedAccounts": "Aucun compte lié",
"allAccountsLinked": "Tous les types de comptes sont liés",
"primary": "Principal",
"unlink": "Délier",
"unlinkAccountConfirmTitle": "Délier le Compte?",
"unlinkConfirm": "Délier",
```

---

## Italian (it.json)

```json
"connectedAccounts": "Account Collegati",
"connectedAccountsDescription": "Gestisci come accedi a Bayit+. Puoi collegare più account per un accesso più facile.",
"linkedAccounts": "Account Collegati",
"linkNewAccount": "Collega Nuovo Account",
"noLinkedAccounts": "Nessun account collegato",
"allAccountsLinked": "Tutti i tipi di account sono collegati",
"primary": "Principale",
"unlink": "Scollega",
"unlinkAccountConfirmTitle": "Scollegare Account?",
"unlinkConfirm": "Scollega",
```

---

## Chinese (zh.json)

```json
"connectedAccounts": "关联账户",
"connectedAccountsDescription": "管理您登录 Bayit+ 的方式。您可以关联多个账户以便更轻松地访问。",
"linkedAccounts": "已关联账户",
"linkNewAccount": "关联新账户",
"noLinkedAccounts": "没有关联的账户",
"allAccountsLinked": "所有账户类型已关联",
"primary": "主要",
"unlink": "取消关联",
"unlinkAccountConfirmTitle": "取消关联账户？",
"unlinkConfirm": "取消关联",
```

---

## Hindi (hi.json)

```json
"connectedAccounts": "कनेक्टेड खाते",
"connectedAccountsDescription": "Bayit+ में अपने साइन इन करने के तरीके को प्रबंधित करें। आसान पहुंच के लिए आप कई खाते लिंक कर सकते हैं।",
"linkedAccounts": "लिंक किए गए खाते",
"linkNewAccount": "नया खाता लिंक करें",
"noLinkedAccounts": "कोई लिंक किए गए खाते नहीं",
"allAccountsLinked": "सभी खाता प्रकार लिंक हैं",
"primary": "प्राथमिक",
"unlink": "अनलिंक करें",
"unlinkAccountConfirmTitle": "खाता अनलिंक करें?",
"unlinkConfirm": "अनलिंक करें",
```

---

## Tamil (ta.json)

```json
"connectedAccounts": "இணைக்கப்பட்ட கணக்குகள்",
"connectedAccountsDescription": "Bayit+ இல் நீங்கள் எவ்வாறு உள்நுழைகிறீர்கள் என்பதை நிர்வகிக்கவும். எளிதான அணுகலுக்கு பல கணக்குகளை இணைக்கலாம்.",
"linkedAccounts": "இணைக்கப்பட்ட கணக்குகள்",
"linkNewAccount": "புதிய கணக்கை இணைக்கவும்",
"noLinkedAccounts": "இணைக்கப்பட்ட கணக்குகள் இல்லை",
"allAccountsLinked": "அனைத்து கணக்கு வகைகளும் இணைக்கப்பட்டுள்ளன",
"primary": "முதன்மை",
"unlink": "இணைப்பை நீக்கு",
"unlinkAccountConfirmTitle": "கணக்கை இணைப்பு நீக்கவா?",
"unlinkConfirm": "இணைப்பை நீக்கு",
```

---

## Bengali (bn.json)

```json
"connectedAccounts": "সংযুক্ত অ্যাকাউন্ট",
"connectedAccountsDescription": "আপনি কীভাবে Bayit+ এ সাইন ইন করেন তা পরিচালনা করুন। সহজ অ্যাক্সেসের জন্য আপনি একাধিক অ্যাকাউন্ট লিঙ্ক করতে পারেন।",
"linkedAccounts": "লিঙ্ক করা অ্যাকাউন্ট",
"linkNewAccount": "নতুন অ্যাকাউন্ট লিঙ্ক করুন",
"noLinkedAccounts": "কোনো লিঙ্ক করা অ্যাকাউন্ট নেই",
"allAccountsLinked": "সমস্ত অ্যাকাউন্ট প্রকার লিঙ্ক করা হয়েছে",
"primary": "প্রাথমিক",
"unlink": "আনলিঙ্ক করুন",
"unlinkAccountConfirmTitle": "অ্যাকাউন্ট আনলিঙ্ক করবেন?",
"unlinkConfirm": "আনলিঙ্ক করুন",
```

---

## Japanese (ja.json)

```json
"connectedAccounts": "接続されたアカウント",
"connectedAccountsDescription": "Bayit+へのサインイン方法を管理します。簡単にアクセスするために複数のアカウントをリンクできます。",
"linkedAccounts": "リンクされたアカウント",
"linkNewAccount": "新しいアカウントをリンク",
"noLinkedAccounts": "リンクされたアカウントがありません",
"allAccountsLinked": "すべてのアカウントタイプがリンクされています",
"primary": "プライマリ",
"unlink": "リンク解除",
"unlinkAccountConfirmTitle": "アカウントのリンクを解除しますか？",
"unlinkConfirm": "リンク解除",
```

---

## Location in JSON Files

Add these strings in the `"settings"` section after `"termsOfService"` or similar settings keys.

**Example structure:**
```json
"settings": {
  "title": "Settings",
  "language": "Language",
  ...
  "termsOfService": "Terms of Service",

  // ADD THE NEW STRINGS HERE
  "connectedAccounts": "...",
  "connectedAccountsDescription": "...",
  ...

  "familyAndSafety": "Family & Safety",
  ...
}
```
