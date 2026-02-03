# User Management Guide

This guide explains how to manage users in the Bayit+ platform using the command-line tools.

## Quick Start

```bash
# Add a new admin user
./scripts/add-admin.sh user@example.com "User Name"

# List all users
./scripts/add-admin.sh --list

# Get help
./scripts/add-admin.sh --help
```

## Tools

### 1. Bash Script (Recommended)

**Location**: `backend/scripts/add-admin.sh`

The bash script provides a user-friendly interface with colored output, validation, and helpful error messages.

```bash
# Usage
cd backend
./scripts/add-admin.sh <email> [name]
./scripts/add-admin.sh --list
./scripts/add-admin.sh --help
```

**Examples**:

```bash
# Create admin with auto-generated name (from email)
./scripts/add-admin.sh user@example.com

# Create admin with custom name
./scripts/add-admin.sh user@example.com "John Doe"

# Upgrade existing user to admin
./scripts/add-admin.sh existing@example.com

# List all users in the database
./scripts/add-admin.sh --list

# Show help and available options
./scripts/add-admin.sh --help
```

### 2. Python Script (Advanced)

**Location**: `backend/scripts/add_admin_user.py`

The Python script provides the core functionality and can be used directly if needed.

```bash
# Usage
cd backend
poetry run python scripts/add_admin_user.py <email> [name]
poetry run python scripts/add_admin_user.py --list
```

**Examples**:

```bash
# Create admin user
poetry run python scripts/add_admin_user.py user@example.com "User Name"

# List users
poetry run python scripts/add_admin_user.py --list
```

## User Roles

The platform supports the following roles (in order of privilege):

| Role | Description | Access Level |
|------|-------------|--------------|
| **super_admin** | Full platform control | Highest - can manage all aspects including other admins |
| **admin** | Platform administration | High - can manage users, content, settings |
| **content_manager** | Content management | Medium - can manage content library |
| **billing_admin** | Billing and subscriptions | Medium - can manage payments and subscriptions |
| **support** | Customer support | Medium - can view users and assist with issues |
| **user** | Regular user | Low - access to subscribed content |
| **viewer** | View-only access | Lowest - limited access pending payment |

## Features

### Creating Users

When you create a new admin user:

- ✅ User is created with admin role
- ✅ Account is automatically activated
- ✅ Email and phone verification are bypassed
- ✅ User is marked as verified
- ✅ User can sign in with Google OAuth immediately

### Upgrading Users

When you upgrade an existing user:

- ✅ Role is changed to admin
- ✅ Account is activated
- ✅ Verification flags are updated
- ✅ User gains admin privileges immediately

### Validation

The bash script includes:

- ✅ Email format validation
- ✅ Directory location checks
- ✅ Poetry environment verification
- ✅ Helpful error messages
- ✅ Color-coded output

## Authentication

Admin users can authenticate using:

1. **Google OAuth** (Primary method)
   - Sign in with the admin email using Google
   - No password required
   - Secure and convenient

2. **Email/Password** (If set up)
   - Traditional login method
   - Requires password reset if not previously set

## Admin Capabilities

Admin users can:

- 👥 Manage users (create, update, delete, ban)
- 📺 Manage content (VOD, Live TV, Radio, Podcasts)
- 💳 Manage subscriptions and billing
- 📊 View analytics and reports
- ⚙️ Configure platform settings
- 📝 View audit logs
- 🎨 Manage UI widgets and layouts
- 🔊 Configure voice settings
- 📧 Manage email templates
- 🎯 Run marketing campaigns

## Security Notes

### Best Practices

1. **Limit Admin Accounts**
   - Only create admin accounts for trusted users
   - Use the minimum required privilege level

2. **Regular Audits**
   - Periodically review admin user list
   - Remove inactive or unnecessary admin accounts

3. **OAuth Authentication**
   - Prefer Google OAuth for better security
   - Enables 2FA if configured on Google account

4. **Audit Logging**
   - All admin actions are logged
   - Review audit logs regularly

### Removing Admin Access

To downgrade an admin user:

1. Go to Admin Dashboard → Users
2. Find the user
3. Change role to "user" or "viewer"
4. Save changes

Or use the admin API:

```bash
PATCH /api/v1/admin/users/{user_id}
{
  "role": "user"
}
```

## Troubleshooting

### Script Fails to Run

```bash
# Ensure you're in the backend directory
cd backend

# Verify Poetry is installed
poetry --version

# Install dependencies
poetry install

# Make script executable
chmod +x scripts/add-admin.sh
```

### Database Connection Issues

```bash
# Check MongoDB URI in .env
cat .env | grep MONGODB_URI

# Verify MongoDB Atlas network access allows your IP

# Test connection
poetry run python scripts/test_mongodb_connection.py
```

### User Already Exists

If the user already exists, the script will upgrade them to admin role instead of creating a duplicate.

### Email Validation Fails

Ensure the email is in valid format:
- ✅ user@example.com
- ✅ user.name@company.co.uk
- ❌ user@example (missing TLD)
- ❌ @example.com (missing username)

## Examples

### Scenario 1: New Admin User

```bash
# Create new admin for platform management
./scripts/add-admin.sh admin@company.com "Admin User"

# Output:
# ℹ Adding admin user: admin@company.com
# ℹ Name: Admin User
#
# 🆕 Creating new admin user:
#    Email: admin@company.com
#    Name: Admin User
#    Role: admin
# ✅ Successfully created admin user admin@company.com!
#
# ✓ Admin user successfully configured!
# ℹ The user can now sign in with Google OAuth using: admin@company.com
```

### Scenario 2: Upgrade Existing User

```bash
# Upgrade existing user to admin
./scripts/add-admin.sh existing@company.com

# Output:
# ℹ Adding admin user: existing@company.com
#
# 📋 User already exists:
#    Email: existing@company.com
#    Name: John Doe
#    Current Role: user
#    Active: True
#
# 🔄 Upgrading to admin...
# ✅ Successfully upgraded existing@company.com to admin!
#
# ✓ Admin user successfully configured!
```

### Scenario 3: List All Users

```bash
# View all users in the database
./scripts/add-admin.sh --list

# Output:
# ℹ Listing all users in the database...
#
# 📋 Found 4 user(s):
#
#   👑 admin@olorin.ai
#      Role: super_admin
#      Name: Gil Klainert
#      Active: True
#
#   👑 oklainert@gmail.com
#      Role: admin
#      Name: Omri Klainert
#      Active: True
#
#   👑 admin@bayit.tv
#      Role: super_admin
#      Name: Admin User
#      Active: True
#
#   👑 ziv.isaiah@gmail.com
#      Role: admin
#      Name: Ziv Isaiah
#      Active: True
#
# ✓ User list retrieved successfully
```

## API Endpoints

For programmatic user management, use the admin API:

```bash
# Get all users
GET /api/v1/admin/users

# Get user by ID
GET /api/v1/admin/users/{user_id}

# Update user
PATCH /api/v1/admin/users/{user_id}

# Delete user
DELETE /api/v1/admin/users/{user_id}

# Ban user
POST /api/v1/admin/users/{user_id}/ban?reason=<reason>
```

See `backend/app/api/routes/admin/users.py` for full API documentation.

## Related Documentation

- [API Documentation](../../docs/api/)
- [Admin Dashboard Guide](../../docs/guides/admin-dashboard.md)
- [Security Guide](../../docs/security/)
- [Audit Logging](../../docs/guides/audit-logging.md)

## Support

For issues or questions:

1. Check this documentation
2. Review the help command: `./scripts/add-admin.sh --help`
3. Check backend logs
4. Contact the development team
