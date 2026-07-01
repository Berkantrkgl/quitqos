package com.dayzerosoft.quitqos.backend.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Dev-only sender used when Firebase credentials are not configured. Logs instead of calling FCM, so
 * the notification flow is testable locally without a service-account JSON. Replaced by
 * {@link RealPushNotificationSender} once credentials are set.
 */
public class StubPushNotificationSender implements PushNotificationSender {

    private static final Logger log = LoggerFactory.getLogger(StubPushNotificationSender.class);

    @Override
    public String send(String fcmToken, String title, String body, String milestoneId) {
        log.info("STUB push -> token={}, milestoneId={}, title='{}'", fcmToken, milestoneId, title);
        return "stub-message-id";
    }
}
