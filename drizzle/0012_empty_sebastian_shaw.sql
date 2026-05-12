CREATE TABLE `coupon_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`couponCode` varchar(100) NOT NULL,
	`orderId` int,
	`orderNumber` varchar(100),
	`customerId` int,
	`customerName` varchar(255),
	`customerPhone` varchar(20),
	`discountAmount` varchar(20) DEFAULT '0',
	`discountBearer` enum('maksab','store','shared') DEFAULT 'maksab',
	`usageDate` timestamp,
	`notes` text,
	`importBatchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupon_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `import_batches` MODIFY COLUMN `importType` enum('stores','menu_products','customers','orders','payments','mandoubs','mandoub_performance','mandoub_dues','refunds','revenues','bookings','coupons','expenses','store_dues','settlements','complaints','coupon_usage') NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `bookingNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_bookingNumber_unique` UNIQUE(`bookingNumber`);