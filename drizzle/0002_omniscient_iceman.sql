CREATE TABLE `store_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stores` RENAME COLUMN `category` TO `storeCategory`;--> statement-breakpoint
ALTER TABLE `mandoubs` MODIFY COLUMN `status` enum('pending_approval','active','inactive','rejected','suspended','archived') NOT NULL DEFAULT 'pending_approval';--> statement-breakpoint
ALTER TABLE `stores` MODIFY COLUMN `storeCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `mandoubs` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `store_images` ADD `caption` varchar(255);--> statement-breakpoint
ALTER TABLE `store_images` ADD `archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `fullNameWithTribe` varchar(255);