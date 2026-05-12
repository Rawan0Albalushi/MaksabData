CREATE TABLE `mandoub_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mandoubId` int NOT NULL,
	`orderId` int,
	`orderNumber` varchar(100),
	`orderDate` timestamp,
	`acceptedAt` timestamp,
	`pickedUpAt` timestamp,
	`deliveredAt` timestamp,
	`deliveryDurationMinutes` int,
	`orderStatus` varchar(50),
	`delayed` boolean DEFAULT false,
	`performanceRating` varchar(20),
	`notes` text,
	`importBatchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mandoub_performance_id` PRIMARY KEY(`id`)
);
