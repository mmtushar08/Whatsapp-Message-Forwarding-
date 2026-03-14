# 👋 Welcome to WhatsApp Message Forwarding App!

This guide is for **non-technical users** who want to use the WhatsApp Message Forwarding app. No coding experience required! Just follow the steps below. 😊

---

## 📋 Table of Contents

1. [What Does This App Do?](#what-does-this-app-do)
2. [What You Need Before Starting](#what-you-need-before-starting)
3. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
4. [How to Use the App](#how-to-use-the-app)
5. [Common Questions (FAQ)](#common-questions-faq)
6. [Troubleshooting](#troubleshooting)
7. [Need Help?](#need-help)

---

## 📱 What Does This App Do?

The **WhatsApp Message Forwarding App** allows you to:

- ✅ **Automatically forward** WhatsApp messages from one number/group to another.
- ✅ **Filter messages** — choose which messages get forwarded (e.g., only messages with certain keywords).
- ✅ **Schedule forwarding** — decide when messages should be forwarded.
- ✅ **Keep a log** of all forwarded messages.

> **In simple words:** Imagine you receive an important WhatsApp message and you want it to be automatically sent to another person or group — this app does that for you, automatically!

---

## ✅ What You Need Before Starting

Before you begin, make sure you have the following:

| Requirement | Description |
|-------------|-------------|
| 📱 **A WhatsApp Account** | A valid WhatsApp number (personal or business) |
| 🌐 **Internet Connection** | A stable internet connection |
| 💻 **A Computer or Laptop** | Windows, Mac, or Linux |
| 🔑 **WhatsApp Cloud API Access** | A Meta/Facebook Developer account (free to create) |

> 💡 **Don't have a Meta Developer account?** Don't worry — follow [this link](https://developers.facebook.com/) to create one for free!

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Create Your Meta Developer Account

1. Go to [https://developers.facebook.com/](https://developers.facebook.com/)
2. Click **"Get Started"**
3. Log in with your Facebook account (or create one)
4. Follow the on-screen instructions to set up your developer account

---

### Step 2: Set Up a WhatsApp Business App

1. In your Meta Developer dashboard, click **"Create App"**
2. Select **"Business"** as the app type
3. Give your app a name (e.g., `My WhatsApp Forwarder`)
4. Click **"Create App"**
5. On the next screen, find **"WhatsApp"** and click **"Set Up"**

---

### Step 3: Get Your API Credentials

Once your WhatsApp app is set up, you'll need two important pieces of information:

- 🔑 **Access Token** — This is like a password for your app
- 📞 **Phone Number ID** — This is the ID of your WhatsApp number

> You can find both of these in your Meta Developer Dashboard under **WhatsApp > API Setup**.

Write them down somewhere safe — you'll need them in the next step!

---

### Step 4: Configure the App

1. Download or open the WhatsApp Message Forwarding app
2. Open the **Settings** or **Configuration** file
3. Fill in the following details:

```
ACCESS_TOKEN = your_access_token_here
PHONE_NUMBER_ID = your_phone_number_id_here
FORWARD_TO_NUMBER = the_number_you_want_to_forward_to
```

4. Save the file

---

### Step 5: Start the App

1. Open the app on your computer
2. Click **"Start"** or run the start command
3. You should see a message like: ✅ `App is running and ready to forward messages!`

---

## 📲 How to Use the App

Once the app is running:

### To Forward All Messages:
- Simply send a message to your WhatsApp number — it will be **automatically forwarded** to your chosen contact or group!

### To Forward Only Specific Messages:
- Go to **Settings → Filters**
- Add keywords (e.g., `urgent`, `important`, `order`)
- Only messages containing those keywords will be forwarded

### To Stop Forwarding:
- Click **"Stop"** in the app, or close the app window

---

## ❓ Common Questions (FAQ)

**Q: Is this app free to use?**
> A: Yes! The app itself is free. However, WhatsApp Cloud API has a free tier with limits. For heavy usage, Meta may charge fees. Check [Meta's pricing page](https://developers.facebook.com/docs/whatsapp/pricing) for details.

---

**Q: Will the person receiving the forwarded message know it was forwarded?**
> A: The message will arrive like a normal WhatsApp message. However, it may include a note saying "Forwarded" depending on your settings.

---

**Q: Can I forward messages to multiple people?**
> A: Yes! You can add multiple numbers or a group in the settings.

---

**Q: Is my data safe?**
> A: The app only processes messages you configure it to forward. No data is stored on external servers. Your API credentials are stored locally on your device.

---

**Q: What happens if my internet goes down?**
> A: The app will pause forwarding. Once your internet is restored, the app will resume automatically.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| ❌ App won't start | Check your internet connection and make sure your Access Token is correct |
| ❌ Messages not being forwarded | Verify your Phone Number ID and the recipient number format (include country code, e.g., `+1234567890`) |
| ❌ Getting an "Unauthorized" error | Your Access Token may have expired — generate a new one from the Meta Developer Dashboard |
| ❌ App crashes | Restart the app. If the problem persists, check the logs for error details |
| ❌ Wrong number receiving messages | Double-check the `FORWARD_TO_NUMBER` in your settings |

---

## 🆘 Need Help?

If you're stuck or have questions, here are your options:

- 📂 **Open an Issue** on this GitHub repository: [Click Here](https://github.com/mmtushar08/Whatsapp-Message-Forwarding-/issues)
- 📖 **Read the WhatsApp Cloud API Docs**: [Meta WhatsApp Docs](https://developers.facebook.com/docs/whatsapp)
- 💬 **Contact the developer**: Reach out via GitHub profile [@mmtushar08](https://github.com/mmtushar08)

---

## 🎉 You're All Set!

Congratulations! 🥳 You've successfully set up the WhatsApp Message Forwarding App. Enjoy automated message forwarding!

> Made with ❤️ by [@mmtushar08](https://github.com/mmtushar08)