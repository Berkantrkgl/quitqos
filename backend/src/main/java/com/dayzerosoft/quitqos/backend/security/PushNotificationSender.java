package com.dayzerosoft.quitqos.backend.security;

/**
 * Sends a milestone push notification to a device. Implemented either by the real Firebase Admin SDK
 * (when credentials are configured) or a dev stub (when they are not).
 */
public interface PushNotificationSender {

    /**
     * @param fcmToken the target device's FCM token
     * @param title notification title (milestone title)
     * @param body notification body (milestone description)
     * @param milestoneId id of the achieved milestone, carried as data payload for client-side deep-linking
     * @return provider message id
     * @throws PushNotificationException if the push could not be sent
     */
    String send(String fcmToken, String title, String body, String milestoneId);
}
