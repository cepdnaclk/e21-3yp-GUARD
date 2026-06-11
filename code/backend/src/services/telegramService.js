import prisma from "../lib/prisma.js";

let lastUpdateId = 0;

/**
 * Sends a HTML formatted message to a Telegram chat.
 * @param {string|number} chatId - Telegram chat ID
 * @param {string} text - Message text (HTML parsed)
 * @param {object} [replyMarkup] - Optional Telegram ReplyMarkup
 */
export const sendTelegramMessage = async (chatId, text, replyMarkup = null) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    return;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("❌ Telegram Send Message Error:", data);
    }
    return data;
  } catch (err) {
    console.error("❌ Telegram Send Message Connection Error:", err.message);
  }
};

/**
 * Polls the Telegram Bot getUpdates API.
 * Matches 6-digit OTP codes and handles contact-sharing confirmations.
 */
export const pollTelegramUpdates = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    return;
  }
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`;

  try {
    const response = await fetch(url);
    if (!response.ok) return;

    const data = await response.json();
    if (!data.ok || !data.result || data.result.length === 0) return;

    for (const update of data.result) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      const message = update.message;
      if (!message) continue;

      const chatId = message.chat.id;
      const text = message.text?.trim();
      const contact = message.contact;

      // 1. Process 6-digit verification code
      if (text && /^\d{6}$/.test(text)) {
        const user = await prisma.user.findFirst({
          where: {
            phoneOtpCode: text,
            phoneOtpExpiry: { gt: new Date() },
          },
        });

        if (user) {
          // Prompt user to share contact
          const replyMarkup = {
            keyboard: [
              [
                {
                  text: "Share Contact 📱",
                  request_contact: true,
                },
              ],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          };

          await sendTelegramMessage(
            chatId,
            `Hello <b>${user.fullName}</b>!\n\nTo complete verification of your phone number <b>${user.pendingPhone}</b>, please click the <b>Share Contact 📱</b> button below.`,
            replyMarkup
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ The verification code <b>${text}</b> is invalid or expired. Please check and request a new code from the profile page.`
          );
        }
      }

      // 2. Process shared contact payload
      if (contact) {
        const sharedPhone = contact.phone_number;
        const cleanShared = sharedPhone.replace(/\D/g, ""); // Extract numbers only

        // Load users currently undergoing phone verification
        const pendingUsers = await prisma.user.findMany({
          where: {
            phoneVerified: false,
            phoneOtpCode: { not: null },
          },
        });

        // Find match by suffix comparison (to ignore country code differences)
        const matchedUser = pendingUsers.find((u) => {
          if (!u.pendingPhone) return false;
          const cleanPending = u.pendingPhone.replace(/\D/g, "");
          return cleanShared.endsWith(cleanPending) || cleanPending.endsWith(cleanShared);
        });

        if (matchedUser) {
          await prisma.user.update({
            where: { id: matchedUser.id },
            data: {
              phoneNumber: matchedUser.pendingPhone,
              phoneVerified: true,
              telegramChatId: String(chatId),
              phoneOtpCode: null,
              phoneOtpExpiry: null,
              pendingPhone: null,
            },
          });

          await sendTelegramMessage(
            chatId,
            `✅ <b>Phone number verified successfully!</b>\n\nYou can now go back to your profile page and click <b>Save Profile</b>.`,
            { remove_keyboard: true }
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `⚠️ Verification failed.\n\nThe shared phone number does not match any pending requests. Please verify the phone number is correctly formatted in the profile page.`,
            { remove_keyboard: true }
          );
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Telegram Bot Polling Error:", err.message);
  }
};
