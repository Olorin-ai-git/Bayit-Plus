#!/bin/bash

# CVPlus Email Service Setup Script
# This script helps configure email services for contact form notifications

set -e

echo "🚀 CVPlus Email Service Setup"
echo "=============================="
echo ""

# Function to setup SendGrid (Recommended)
setup_sendgrid() {
    echo "📧 Setting up SendGrid Email Service"
    echo ""
    echo "1. Go to https://sendgrid.com and create an account"
    echo "2. Navigate to Settings > API Keys"
    echo "3. Create a new API key with Mail Send permissions"
    echo "4. Copy the API key when it's generated"
    echo ""
    read -p "Enter your SendGrid API key: " sendgrid_key
    
    if [ ! -z "$sendgrid_key" ]; then
        echo "Setting SendGrid API key in Firebase secrets..."
        firebase functions:secrets:set SENDGRID_API_KEY="$sendgrid_key"
        echo "✅ SendGrid configured successfully!"
        return 0
    else
        echo "❌ No API key provided"
        return 1
    fi
}

# Function to setup Resend
setup_resend() {
    echo "📧 Setting up Resend Email Service"
    echo ""
    echo "1. Go to https://resend.com and create an account"
    echo "2. Navigate to API Keys section"
    echo "3. Create a new API key"
    echo "4. Copy the API key"
    echo ""
    read -p "Enter your Resend API key: " resend_key
    
    if [ ! -z "$resend_key" ]; then
        echo "Setting Resend API key in Firebase secrets..."
        firebase functions:secrets:set RESEND_API_KEY="$resend_key"
        echo "✅ Resend configured successfully!"
        return 0
    else
        echo "❌ No API key provided"
        return 1
    fi
}

# Function to setup Gmail
setup_gmail() {
    echo "📧 Setting up Gmail Email Service"
    echo ""
    echo "⚠️  WARNING: Gmail setup requires app-specific passwords"
    echo "1. Enable 2-Factor Authentication on your Google account"
    echo "2. Go to Google Account settings > Security > App passwords"
    echo "3. Generate a new app password for 'Mail'"
    echo "4. Use this app password (not your regular password)"
    echo ""
    read -p "Enter your Gmail address: " gmail_user
    read -s -p "Enter your Gmail app password: " gmail_password
    echo ""
    
    if [ ! -z "$gmail_user" ] && [ ! -z "$gmail_password" ]; then
        echo "Setting Gmail credentials in Firebase secrets..."
        firebase functions:secrets:set EMAIL_USER="$gmail_user"
        firebase functions:secrets:set EMAIL_PASSWORD="$gmail_password"
        echo "✅ Gmail configured successfully!"
        return 0
    else
        echo "❌ Incomplete credentials provided"
        return 1
    fi
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged into Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

echo "Choose an email service provider:"
echo "1. SendGrid (Recommended for production)"
echo "2. Resend (Good alternative)"
echo "3. Gmail (For development/testing only)"
echo "4. Test current configuration"
echo "5. Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_sendgrid
        ;;
    2)
        setup_resend
        ;;
    3)
        setup_gmail
        ;;
    4)
        echo "🧪 Testing current email configuration..."
        echo "Deploy your functions and call the testEmailConfiguration function"
        echo "You can test it from the Firebase Console or using the Firebase SDK"
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Email service setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy your functions: firebase deploy --only functions"
    echo "2. Test the configuration using the testEmailConfiguration function"
    echo "3. Your contact forms will now send email notifications!"
    echo ""
    echo "💡 Tip: You can test the email service by submitting a contact form"
    echo "   on any public CV profile or calling the test function directly."
fi