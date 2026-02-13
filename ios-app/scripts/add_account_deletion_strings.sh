#!/bin/bash

# Script to add account deletion strings to all locale files

LOCALE_DIR="/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app/Packages/BayitLocalization/Sources/Resources"

# French (fr.json)
sed -i '' 's/"profile": "Profil"/"profile": "Profil",\
    "dangerZone": "Zone dangereuse",\
    "deleteAccount": "Supprimer le compte",\
    "deleteAccountConfirmTitle": "Supprimer le compte?",\
    "deleteAccountConfirmMessage": "Cette action supprimera définitivement votre compte et toutes les données associées. Cette action est irréversible.",\
    "deleteAccountConfirm": "Supprimer le compte"/g' "${LOCALE_DIR}/fr.json"

# Italian (it.json)
sed -i '' 's/"profile": "Profilo"/"profile": "Profilo",\
    "dangerZone": "Zona pericolosa",\
    "deleteAccount": "Elimina account",\
    "deleteAccountConfirmTitle": "Eliminare l'\''account?",\
    "deleteAccountConfirmMessage": "Questa azione eliminerà permanentemente il tuo account e tutti i dati associati. Questa azione non può essere annullata.",\
    "deleteAccountConfirm": "Elimina account"/g' "${LOCALE_DIR}/it.json"

# Hindi (hi.json)
sed -i '' 's/"profile": "प्रोफ़ाइल"/"profile": "प्रोफ़ाइल",\
    "dangerZone": "खतरे का क्षेत्र",\
    "deleteAccount": "खाता हटाएं",\
    "deleteAccountConfirmTitle": "खाता हटाएं?",\
    "deleteAccountConfirmMessage": "यह आपके खाते और सभी संबंधित डेटा को स्थायी रूप से हटा देगा। इस क्रिया को पूर्ववत नहीं किया जा सकता।",\
    "deleteAccountConfirm": "खाता हटाएं"/g' "${LOCALE_DIR}/hi.json"

# Bengali (bn.json)
sed -i '' 's/"profile": "প্রোফাইল"/"profile": "প্রোফাইল",\
    "dangerZone": "বিপদ অঞ্চল",\
    "deleteAccount": "অ্যাকাউন্ট মুছুন",\
    "deleteAccountConfirmTitle": "অ্যাকাউন্ট মুছবেন?",\
    "deleteAccountConfirmMessage": "এটি আপনার অ্যাকাউন্ট এবং সমস্ত সম্পর্কিত ডেটা স্থায়ীভাবে মুছে দেবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।",\
    "deleteAccountConfirm": "অ্যাকাউন্ট মুছুন"/g' "${LOCALE_DIR}/bn.json"

# Tamil (ta.json)
sed -i '' 's/"profile": "சுயவிவரம்"/"profile": "சுயவிவரம்",\
    "dangerZone": "ஆபத்து மண்டலம்",\
    "deleteAccount": "கணக்கை நீக்கு",\
    "deleteAccountConfirmTitle": "கணக்கை நீக்கவா?",\
    "deleteAccountConfirmMessage": "இது உங்கள் கணக்கையும் அனைத்து தொடர்புடைய தரவையும் நிரந்தரமாக நீக்கும். இந்த செயலை மாற்ற முடியாது.",\
    "deleteAccountConfirm": "கணக்கை நீக்கு"/g' "${LOCALE_DIR}/ta.json"

# Japanese (ja.json)
sed -i '' 's/"profile": "プロフィール"/"profile": "プロフィール",\
    "dangerZone": "危険ゾーン",\
    "deleteAccount": "アカウントを削除",\
    "deleteAccountConfirmTitle": "アカウントを削除しますか？",\
    "deleteAccountConfirmMessage": "この操作により、アカウントとすべての関連データが完全に削除されます。この操作は元に戻せません。",\
    "deleteAccountConfirm": "アカウントを削除"/g' "${LOCALE_DIR}/ja.json"

# Chinese (zh.json)
sed -i '' 's/"profile": "个人资料"/"profile": "个人资料",\
    "dangerZone": "危险区域",\
    "deleteAccount": "删除账户",\
    "deleteAccountConfirmTitle": "删除账户？",\
    "deleteAccountConfirmMessage": "这将永久删除您的账户和所有关联数据。此操作无法撤销。",\
    "deleteAccountConfirm": "删除账户"/g' "${LOCALE_DIR}/zh.json"

echo "Account deletion strings added to all locale files"
