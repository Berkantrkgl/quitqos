package com.dayzerosoft.quitqos.backend.web;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.service.SyncService;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncRequest;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guest→registered data sync (API design §8). Called once after a guest upgrades: the device's
 * quit-attempt history is merged server-side, idempotently by localId.
 */
@RestController
@RequestMapping("/api/v1/users/me")
public class SyncController {

    private final SyncService service;

    public SyncController(SyncService service) {
        this.service = service;
    }

    /** Merge the device's quit-attempt history into the account. */
    @PostMapping("/sync")
    public SyncResponse sync(@AuthenticationPrincipal UUID userId,
                             @Valid @RequestBody SyncRequest request) {
        return service.sync(userId, request);
    }
}
