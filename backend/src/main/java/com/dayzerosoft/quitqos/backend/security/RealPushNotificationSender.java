package com.dayzerosoft.quitqos.backend.security;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;

/** Sends milestone pushes via the Firebase Admin SDK. */
public class RealPushNotificationSender implements PushNotificationSender {

    private final FirebaseMessaging messaging;

    public RealPushNotificationSender(FirebaseMessaging messaging) {
        this.messaging = messaging;
    }

    @Override
    public String send(String fcmToken, String title, String body, String milestoneId) {
        Message message = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .putData("type", "milestone")
                .putData("milestoneId", milestoneId)
                .build();
        try {
            return messaging.send(message);
        } catch (FirebaseMessagingException e) {
            throw new PushNotificationException("Failed to send FCM push", e);
        }
    }
}
