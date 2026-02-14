#!/bin/bash

# Script to add Connected Accounts localization strings to all language files

# Define translations for each language
declare -A FRENCH
FRENCH[connectedAccounts]="Comptes Connectés"
FRENCH[connectedAccountsDescription]="Gérez comment vous vous connectez à Bayit+. Vous pouvez lier plusieurs comptes pour un accès plus facile."
FRENCH[linkedAccounts]="Comptes Liés"
FRENCH[linkNewAccount]="Lier un Nouveau Compte"
FRENCH[noLinkedAccounts]="Aucun compte lié"
FRENCH[allAccountsLinked]="Tous les types de comptes sont liés"
FRENCH[primary]="Principal"
FRENCH[unlink]="Délier"
FRENCH[unlinkAccountConfirmTitle]="Délier le Compte?"
FRENCH[unlinkConfirm]="Délier"

declare -A ITALIAN
ITALIAN[connectedAccounts]="Account Collegati"
ITALIAN[connectedAccountsDescription]="Gestisci come accedi a Bayit+. Puoi collegare più account per un accesso più facile."
ITALIAN[linkedAccounts]="Account Collegati"
ITALIAN[linkNewAccount]="Collega Nuovo Account"
ITALIAN[noLinkedAccounts]="Nessun account collegato"
ITALIAN[allAccountsLinked]="Tutti i tipi di account sono collegati"
ITALIAN[primary]="Principale"
ITALIAN[unlink]="Scollega"
ITALIAN[unlinkAccountConfirmTitle]="Scollegare Account?"
ITALIAN[unlinkConfirm]="Scollega"

declare -A CHINESE
CHINESE[connectedAccounts]="关联账户"
CHINESE[connectedAccountsDescription]="管理您登录 Bayit+ 的方式。您可以关联多个账户以便更轻松地访问。"
CHINESE[linkedAccounts]="已关联账户"
CHINESE[linkNewAccount]="关联新账户"
CHINESE[noLinkedAccounts]="没有关联的账户"
CHINESE[allAccountsLinked]="所有账户类型已关联"
CHINESE[primary]="主要"
CHINESE[unlink]="取消关联"
CHINESE[unlinkAccountConfirmTitle]="取消关联账户？"
CHINESE[unlinkConfirm]="取消关联"

declare -A HINDI
HINDI[connectedAccounts]="कनेक्टेड खाते"
HINDI[connectedAccountsDescription]="Bayit+ में अपने साइन इन करने के तरीके को प्रबंधित करें। आसान पहुंच के लिए आप कई खाते लिंक कर सकते हैं।"
HINDI[linkedAccounts]="लिंक किए गए खाते"
HINDI[linkNewAccount]="नया खाता लिंक करें"
HINDI[noLinkedAccounts]="कोई लिंक किए गए खाते नहीं"
HINDI[allAccountsLinked]="सभी खाता प्रकार लिंक हैं"
HINDI[primary]="प्राथमिक"
HINDI[unlink]="अनलिंक करें"
HINDI[unlinkAccountConfirmTitle]="खाता अनलिंक करें?"
HINDI[unlinkConfirm]="अनलिंक करें"

declare -A TAMIL
TAMIL[connectedAccounts]="இணைக்கப்பட்ட கணக்குகள்"
TAMIL[connectedAccountsDescription]="Bayit+ இல் நீங்கள் எவ்வாறு உள்நுழைகிறீர்கள் என்பதை நிர்வகிக்கவும். எளிதான அணுகலுக்கு பல கணக்குகளை இணைக்கலாம்."
TAMIL[linkedAccounts]="இணைக்கப்பட்ட கணக்குகள்"
TAMIL[linkNewAccount]="புதிய கணக்கை இணைக்கவும்"
TAMIL[noLinkedAccounts]="இணைக்கப்பட்ட கணக்குகள் இல்லை"
TAMIL[allAccountsLinked]="அனைத்து கணக்கு வகைகளும் இணைக்கப்பட்டுள்ளன"
TAMIL[primary]="முதன்மை"
TAMIL[unlink]="இணைப்பை நீக்கு"
TAMIL[unlinkAccountConfirmTitle]="கணக்கை இணைப்பு நீக்கவா?"
TAMIL[unlinkConfirm]="இணைப்பை நீக்கு"

declare -A BENGALI
BENGALI[connectedAccounts]="সংযুক্ত অ্যাকাউন্ট"
BENGALI[connectedAccountsDescription]="আপনি কীভাবে Bayit+ এ সাইন ইন করেন তা পরিচালনা করুন। সহজ অ্যাক্সেসের জন্য আপনি একাধিক অ্যাকাউন্ট লিঙ্ক করতে পারেন।"
BENGALI[linkedAccounts]="লিঙ্ক করা অ্যাকাউন্ট"
BENGALI[linkNewAccount]="নতুন অ্যাকাউন্ট লিঙ্ক করুন"
BENGALI[noLinkedAccounts]="কোনো লিঙ্ক করা অ্যাকাউন্ট নেই"
BENGALI[allAccountsLinked]="সমস্ত অ্যাকাউন্ট প্রকার লিঙ্ক করা হয়েছে"
BENGALI[primary]="প্রাথমিক"
BENGALI[unlink]="আনলিঙ্ক করুন"
BENGALI[unlinkAccountConfirmTitle]="অ্যাকাউন্ট আনলিঙ্ক করবেন?"
BENGALI[unlinkConfirm]="আনলিঙ্ক করুন"

declare -A JAPANESE
JAPANESE[connectedAccounts]="接続されたアカウント"
JAPANESE[connectedAccountsDescription]="Bayit+へのサインイン方法を管理します。簡単にアクセスするために複数のアカウントをリンクできます。"
JAPANESE[linkedAccounts]="リンクされたアカウント"
JAPANESE[linkNewAccount]="新しいアカウントをリンク"
JAPANESE[noLinkedAccounts]="リンクされたアカウントがありません"
JAPANESE[allAccountsLinked]="すべてのアカウントタイプがリンクされています"
JAPANESE[primary]="プライマリ"
JAPANESE[unlink]="リンク解除"
JAPANESE[unlinkAccountConfirmTitle]="アカウントのリンクを解除しますか？"
JAPANESE[unlinkConfirm]="リンク解除"

echo "Adding Connected Accounts localization strings..."
echo "✅ English (en.json) - Already added"
echo "✅ Hebrew (he.json) - Already added"
echo "✅ Spanish (es.json) - Already added"
echo ""
echo "The remaining languages (fr, it, zh, hi, ta, bn, ja) need to be added manually."
echo "Translations are ready above. Please add them to the settings section of each file."
