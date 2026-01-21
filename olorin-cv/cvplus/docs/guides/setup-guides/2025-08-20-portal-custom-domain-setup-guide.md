# Setting up klainert.com with Firebase Hosting

## Step 1: Add Custom Domain in Firebase Console

1. Go to https://console.firebase.google.com/project/klainert-1973/hosting/sites
2. Click on "Add custom domain"
3. Enter `klainert.com` and `www.klainert.com`
4. Firebase will provide you with DNS records to add

## Step 2: Update GoDaddy DNS Records

Based on your current DNS configuration, you'll need to update these records in GoDaddy:

### For klainert.com (root domain):
- **Delete or update** the current A record pointing to `199.36.158.100`
- **Add** these A records (Firebase will provide the exact IPs):
  ```
  @    300    IN    A    [Firebase IP 1]
  @    300    IN    A    [Firebase IP 2]
  ```

### For www.klainert.com:
- **Keep** the existing CNAME record:
  ```
  www    3600    IN    CNAME    @
  ```
  This is perfect as it points www to your root domain.

### Keep these existing records:
- All MX records (for email)
- All Microsoft-related records (autodiscover, lyncdiscover, etc.)
- TXT records for SPF and Microsoft
- The TXT record `"hosting-site=klainert-1973"` (this might be used by Firebase)

## Step 3: Firebase will provide specific records

When you add the custom domain in Firebase Console, it will show:
1. Verification TXT record (temporary, can be removed after verification)
2. Two A records with specific IP addresses

## Step 4: Wait for DNS propagation

- DNS changes can take up to 48 hours to propagate
- Firebase will automatically provision SSL certificates once DNS is verified

## Current Status

Your domain is currently:
- Parked at GoDaddy (A record to 199.36.158.100)
- Has Microsoft 365 email configured
- Has proper www subdomain setup

## Important Notes

- Your email service won't be affected (MX records remain unchanged)
- The www subdomain is already properly configured
- SSL certificates will be automatically provisioned by Firebase