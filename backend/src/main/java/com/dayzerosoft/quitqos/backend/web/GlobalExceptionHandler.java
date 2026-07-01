package com.dayzerosoft.quitqos.backend.web;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;

import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.web.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates exceptions into the standard error body (API design §1). Each handler builds an
 * {@link ApiError} from the request path and an HTTP status.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
        return build(ex.status(), ex.getMessage(), request);
    }

    @ExceptionHandler(FirebaseTokenVerifier.FirebaseAuthException.class)
    ResponseEntity<ApiError> handleFirebase(FirebaseTokenVerifier.FirebaseAuthException ex,
                                            HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex,
                                              HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Validation failed");
        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    /** A query-param/path-var that can't be coerced to its type (e.g. ?status=FOO) is a bad request. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Invalid value for '" + ex.getName() + "'", request);
    }

    /** Malformed/unparseable request body (bad JSON, invalid timestamp) is a bad request. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex,
                                              HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Malformed request body", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleNotFound(NoResourceFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Resource not found", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", request);
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String message, HttpServletRequest request) {
        ApiError body = new ApiError(Instant.now(), status.value(), status.name(), message,
                request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
