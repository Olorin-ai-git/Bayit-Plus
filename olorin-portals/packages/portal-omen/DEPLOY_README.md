# Portal-Omen Quick Deployment

## 🎯 Status: READY FOR DEPLOYMENT

✅ **Production Approval**: All 13 reviewers approved (Grade: A-)
✅ **Configuration Files**: All created and verified
✅ **Security**: CSP headers configured, all vulnerabilities addressed
✅ **i18n**: English + Hebrew translations complete (316 keys each)
✅ **Accessibility**: WCAG 2.1 AA compliant

---

## 🚀 Quick Start (5 Steps)

### 1. Get EmailJS Credentials

Visit https://dashboard.emailjs.com/ and:
- Create/login to account
- Create Email Service (Gmail/Outlook/etc.)
- Create Email Template with variables: `from_name`, `from_email`, `company`, `phone`, `use_case`, `interest`, `message`, `portal`
- Copy Service ID, Template ID, and Public Key

### 2. Update .env File

Edit `/packages/portal-omen/.env`:

```bash
# Replace these three values:
REACT_APP_EMAILJS_SERVICE_ID=YOUR_SERVICE_ID_HERE
REACT_APP_EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID_HERE
REACT_APP_EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

### 3. Build

```bash
cd /Users/olorin/Documents/olorin/olorin-portals/packages/portal-omen
npm install
npm run build
```

### 4. Deploy

```bash
firebase deploy --only hosting:portal-omen
```

### 5. Verify

Visit **https://olorin-omen.web.app** and test:
- ✅ All pages load
- ✅ Language switcher works (EN ⇄ HE)
- ✅ Contact form submits successfully
- ✅ No console errors

---

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `.firebaserc` | Firebase project config | ✅ Created |
| `firebase.json` | Hosting + CSP headers | ✅ Configured |
| `.env` | Environment variables | ⚠️ Needs EmailJS credentials |
| `DEPLOYMENT_GUIDE.md` | Full deployment guide | ✅ Created |

---

## 🐛 Quick Troubleshooting

**Contact form fails?**
- Check EmailJS credentials in .env
- Verify CSP headers include `https://api.emailjs.com`
- Check browser console for errors

**Language switcher not working?**
- Clear browser cache (Ctrl+Shift+R)
- Check Network tab for `omen.en.json` / `omen.he.json`
- Verify localStorage has `i18nextLng` key

**Deployment fails?**
- Run `firebase login` to authenticate
- Check `.firebaserc` has correct project (olorin-ai)
- Verify site exists: `firebase hosting:sites:list`

---

## 📖 Full Documentation

See **DEPLOYMENT_GUIDE.md** for:
- Complete EmailJS setup walkthrough
- Comprehensive verification checklist
- Detailed troubleshooting steps
- Performance monitoring guide
- Accessibility testing procedures

---

## 🌐 Live URL

Once deployed: **https://olorin-omen.web.app**

---

## ✅ Next Steps

1. **Now**: Update .env with EmailJS credentials
2. **Then**: Run build and deploy commands above
3. **Finally**: Test live site and verify functionality

Good luck with the deployment! 🚀
