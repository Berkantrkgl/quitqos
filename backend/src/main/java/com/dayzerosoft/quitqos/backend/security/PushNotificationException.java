package com.dayzerosoft.quitqos.backend.security;

/** Thrown when an FCM push could not be delivered. */
public class PushNotificationException extends RuntimeException {
    public PushNotificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
