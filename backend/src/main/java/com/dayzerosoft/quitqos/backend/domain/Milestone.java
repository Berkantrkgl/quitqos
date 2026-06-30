package com.dayzerosoft.quitqos.backend.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

/** Static milestone catalogue (9 seed rows). Each milestone awards one {@link Badge}. */
@Entity
@Table(name = "milestone")
@Getter
@Setter
@NoArgsConstructor
public class Milestone {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    /** Elapsed minutes from streak start at which this milestone is reached. Unique. */
    @Column(name = "offset_minutes", nullable = false, unique = true)
    private int offsetMinutes;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;
}
