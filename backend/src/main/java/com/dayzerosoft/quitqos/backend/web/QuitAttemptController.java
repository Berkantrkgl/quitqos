package com.dayzerosoft.quitqos.backend.web;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.service.QuitAttemptService;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.CreateQuitAttemptRequest;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptListResponse;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptResponse;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.RelapseRequest;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.RelapseResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Quit-attempt endpoints (API design §5). The authenticated user id is the principal set by
 * {@link com.dayzerosoft.quitqos.backend.security.JwtAuthenticationFilter}.
 */
@RestController
@RequestMapping("/api/v1/quit-attempts")
public class QuitAttemptController {

    /** Fallback ordering for the history list when no valid ?sort is given. */
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "startedAt");

    private final QuitAttemptService service;

    public QuitAttemptController(QuitAttemptService service) {
        this.service = service;
    }

    /** Start a new streak. Backdated allowed; future startedAt → 422; existing ACTIVE → 409. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuitAttemptResponse create(@AuthenticationPrincipal UUID userId,
                                      @Valid @RequestBody(required = false) CreateQuitAttemptRequest request) {
        CreateQuitAttemptRequest body = request != null ? request : new CreateQuitAttemptRequest(null);
        return service.create(userId, body);
    }

    /** Active streak + live counter. 404 if none. */
    @GetMapping("/current")
    public QuitAttemptResponse current(@AuthenticationPrincipal UUID userId) {
        return service.current(userId);
    }

    /** History, optionally filtered by ?status, ordered by ?sort (default startedAt,desc). */
    @GetMapping
    public QuitAttemptListResponse list(@AuthenticationPrincipal UUID userId,
                                        @RequestParam(required = false) String sort,
                                        @RequestParam(required = false) QuitStatus status) {
        return service.list(userId, parseSort(sort), status);
    }

    /** Single attempt detail (must be owned by the caller). */
    @GetMapping("/{id}")
    public QuitAttemptResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return service.get(userId, id);
    }

    /** Close the active attempt (status RELAPSED, endedAt set). */
    @PostMapping("/{id}/relapse")
    public RelapseResponse relapse(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                   @Valid @RequestBody(required = false) RelapseRequest request) {
        return service.relapse(userId, id, request != null ? request.endedAt() : null);
    }

    /**
     * Parse {@code field,dir} (e.g. {@code startedAt,desc}) into a Sort, restricted to the fields we
     * expose. Anything unrecognized falls back to the default rather than 400-ing.
     */
    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return DEFAULT_SORT;
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim();
        if (!field.equals("startedAt") && !field.equals("endedAt")) {
            return DEFAULT_SORT;
        }
        Sort.Direction dir = parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(dir, field);
    }
}
