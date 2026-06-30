package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Instant;

/**
 * Standard error body returned for every non-2xx response (see API design §1).
 * {@code error} is the machine-readable HTTP status name (e.g. {@code NOT_FOUND}).
 */
public record ApiError(Instant timestamp, int status, String error, String message, String path) {
}
