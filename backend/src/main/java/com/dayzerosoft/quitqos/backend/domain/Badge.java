package com.dayzerosoft.quitqos.backend.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

/** Static badge catalogue. Rows are seeded via Flyway; not created at runtime. */
@Entity
@Table(name = "badge")
@Getter
@Setter
@NoArgsConstructor
public class Badge {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "icon_url")
    private String iconUrl;
}
