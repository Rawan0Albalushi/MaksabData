CREATE TABLE `import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importType` enum('stores','menu_products','customers','orders','payments') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`uploadedById` int NOT NULL,
	`uploadedByName` varchar(255),
	`totalRows` int NOT NULL DEFAULT 0,
	`importedRows` int NOT NULL DEFAULT 0,
	`skippedRows` int NOT NULL DEFAULT 0,
	`duplicateRows` int NOT NULL DEFAULT 0,
	`importBatchStatus` enum('pending_preview','imported','imported_with_errors','failed','cancelled') NOT NULL DEFAULT 'pending_preview',
	`errorSummary` json,
	`duplicateHandling` enum('skip','import_anyway','update_existing') DEFAULT 'skip',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentReference` varchar(100),
	`orderId` int,
	`bookingId` int,
	`customerId` int,
	`amount` varchar(20) NOT NULL DEFAULT '0',
	`pmtMethod` enum('in_app_payment','cash','bank_transfer','card','other'),
	`pmtStatus` enum('paid','not_paid','partially_paid','refunded','partially_refunded','failed','needs_review') NOT NULL DEFAULT 'not_paid',
	`paymentDate` timestamp,
	`isRefunded` boolean DEFAULT false,
	`refundAmount` varchar(20),
	`notes` text,
	`importBatchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
