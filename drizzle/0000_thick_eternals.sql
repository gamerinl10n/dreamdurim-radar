CREATE TABLE `collection_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`query` text NOT NULL,
	`fetched_count` integer DEFAULT 0 NOT NULL,
	`stored_count` integer DEFAULT 0 NOT NULL,
	`merged_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `collection_runs_provider_started_idx` ON `collection_runs` (`provider`,`started_at`);--> statement-breakpoint
CREATE TABLE `job_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`source_url` text NOT NULL,
	`source_kind` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_sources_provider_external_unique` ON `job_sources` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `job_sources_job_id_idx` ON `job_sources` (`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`summary` text NOT NULL,
	`matched_keywords` text NOT NULL,
	`score` integer NOT NULL,
	`score_kind` text DEFAULT 'rules' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`published_at` integer,
	`deadline` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_fingerprint_unique` ON `jobs` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `jobs_review_queue_idx` ON `jobs` (`status`,`score`);--> statement-breakpoint
CREATE INDEX `jobs_published_at_idx` ON `jobs` (`published_at`);--> statement-breakpoint
CREATE TABLE `review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`decision` text NOT NULL,
	`reviewer` text DEFAULT 'operator' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_decisions_job_created_idx` ON `review_decisions` (`job_id`,`created_at`);