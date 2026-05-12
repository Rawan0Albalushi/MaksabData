CREATE TABLE `approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` enum('profile_edit','mandoub_activation','store_activation','role_change','other') NOT NULL,
	`requestedById` int NOT NULL,
	`targetEntityType` varchar(50),
	`targetEntityId` int,
	`oldData` json,
	`newData` json,
	`approvalStatus` enum('pending_review','approved','rejected','needs_changes','cancelled') NOT NULL DEFAULT 'pending_review',
	`reviewedById` int,
	`reviewDate` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`actionType` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`oldValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`wilayatId` int,
	`maksabRole` enum('manager','deputy_manager','top_employee_minister','finance_manager','state_employee_minister','employee'),
	`jobTitle` varchar(255),
	`status` enum('active','inactive','pending_approval','suspended','archived') NOT NULL DEFAULT 'active',
	`managerId` int,
	`profilePhoto` varchar(512),
	`notes` text,
	`permissions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived` boolean NOT NULL DEFAULT false,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mandoubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`wilayatId` int,
	`mandoubType` enum('fast','long_distance') NOT NULL,
	`responsibleEmployeeId` int,
	`status` enum('pending_approval','active','inactive','suspended','archived') NOT NULL DEFAULT 'pending_approval',
	`profilePhoto` varchar(512),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived` boolean NOT NULL DEFAULT false,
	CONSTRAINT `mandoubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`notificationType` enum('approval_request','approval_result','activation','deactivation','general') DEFAULT 'general',
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`categoryId` int,
	`name` varchar(255) NOT NULL,
	`price` varchar(20),
	`description` text,
	`productImage` varchar(512),
	`productStatus` enum('available','not_available','not_specified') DEFAULT 'not_specified',
	`showInApp` boolean DEFAULT true,
	`addons` json,
	`notes` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived` boolean NOT NULL DEFAULT false,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`employeeId` int,
	`actionType` varchar(100) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`imageUrl` varchar(512) NOT NULL,
	`imageType` enum('logo','cover','menu','product','additional','file') DEFAULT 'additional',
	`title` varchar(255),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`merchantName` varchar(255),
	`merchantPhone` varchar(20),
	`whatsappNumber` varchar(20),
	`category` enum('restaurant','cafe','supermarket','sweets','bakery','store','other'),
	`communicationStatus` enum('yes','no','no_response','needs_followup','not_specified'),
	`merchantApproval` enum('yes','no','waiting_response','not_specified'),
	`addedInSystem` enum('yes','no','in_progress','missing_data'),
	`activationStatus` enum('active','inactive','temporarily_stopped','hidden_from_app','pending_activation') DEFAULT 'inactive',
	`classification` enum('contracted','ezhalha','not_specified') DEFAULT 'not_specified',
	`wilayatId` int,
	`region` varchar(255),
	`responsibleEmployeeId` int,
	`shortDescription` text,
	`showInApp` boolean DEFAULT false,
	`notes` text,
	`governorate` varchar(255),
	`detailedAddress` text,
	`googleMapsLink` varchar(512),
	`locationNotes` text,
	`workingDays` varchar(255),
	`openingTime` varchar(10),
	`closingTime` varchar(10),
	`avgPreparationTime` varchar(50),
	`acceptsOrdersNow` boolean,
	`operationStatus` enum('open','closed','busy','temporarily_not_accepting','not_specified'),
	`operationNotes` text,
	`responsiblePersonName` varchar(255),
	`responsiblePersonPhone` varchar(20),
	`preferredCommunication` enum('call','whatsapp','message','not_specified'),
	`communicationNotes` text,
	`contractStartDate` timestamp,
	`contractEndDate` timestamp,
	`contractStatus` enum('active','expired','under_review','not_specified'),
	`commissionPercentage` varchar(10),
	`orderReceivingMethod` enum('whatsapp','call','manual_maksab','not_specified'),
	`merchantReceivesDirectly` enum('yes','no','not_specified'),
	`agreementNotes` text,
	`internalManagementNotes` text,
	`ezhalhaExecutionMethod` enum('call_store','whatsapp_store','direct_order','send_mandoub','not_specified'),
	`ezhalhaPricesConfirmed` enum('confirmed','not_confirmed','approximate','not_specified'),
	`ezhalhaMenuConfirmed` enum('confirmed','not_confirmed','needs_update','not_specified'),
	`ezhalhaLastUpdateDate` timestamp,
	`ezhalhaRequiresReview` boolean,
	`ezhalhaOperationsNotes` text,
	`storeLogo` varchar(512),
	`coverImage` varchar(512),
	`storeStatus` enum('active','inactive','pending','archived') DEFAULT 'inactive',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived` boolean NOT NULL DEFAULT false,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wilayats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`governorate` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wilayats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `maksabRole` enum('manager','deputy_manager','top_employee_minister','finance_manager','state_employee_minister','employee','mandoub');--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `wilayatId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `profilePhoto` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive','pending_approval','suspended','archived') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `managerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` json;--> statement-breakpoint
ALTER TABLE `users` ADD `archived` boolean DEFAULT false NOT NULL;