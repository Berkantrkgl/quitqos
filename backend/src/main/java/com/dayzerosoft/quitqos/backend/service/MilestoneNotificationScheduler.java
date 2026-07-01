package com.dayzerosoft.quitqos.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodic trigger for {@link MilestoneNotificationService} (API design §10: "örn. her dakika"). */
@Component
public class MilestoneNotificationScheduler {

    private final MilestoneNotificationService notificationService;

    public MilestoneNotificationScheduler(MilestoneNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRateString = "${quitqos.notifications.scheduler-rate-ms:60000}")
    public void run() {
        notificationService.processActiveAttempts();
    }
}
