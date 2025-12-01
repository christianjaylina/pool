-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: pool_reservation_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_user_id` int NOT NULL,
  `action` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_user_id` (`admin_user_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES (1,2,'deactivated renter account ID 1.','2025-11-15 15:08:31'),(2,2,'activated renter account ID 1.','2025-11-15 15:09:43'),(3,2,'approved reservation 1 for user 1.','2025-11-15 15:13:22'),(4,2,'Updated pool capacity settings to: S1=5, S2=5, S3=5, S4=5.','2025-11-15 15:35:33'),(5,2,'approved reservation 2 for user 3.','2025-11-15 15:43:32'),(6,2,'approved reservation 5 for user 1.','2025-11-28 14:27:52'),(7,2,'deactivated renter account ID 1.','2025-11-30 02:42:55'),(8,2,'activated renter account ID 1.','2025-11-30 02:44:19'),(9,2,'approved reservation 6 for user 1.','2025-11-30 02:46:38'),(10,2,'approved reservation 7 for user 1.','2025-11-30 03:04:54'),(11,2,'Cancelled approved reservation 7 for user Test Test. Reason: emergency pool maintenance...','2025-11-30 03:15:03'),(12,2,'approved reservation 8 for user 1.','2025-11-30 03:19:03'),(13,2,'Cancelled approved reservation 8 for user Test Test. Reason: pool maintenance...','2025-11-30 03:22:09'),(14,2,'approved reservation 9 for user 3.','2025-11-30 03:22:55'),(15,2,'Cancelled approved reservation 9 for user test test. Reason: pool maintenance...','2025-11-30 03:23:20'),(16,2,'approved reservation 10 for user 3.','2025-11-30 03:31:42'),(17,2,'Cancelled approved reservation 10 for user test test. Reason: pool maintenance...','2025-11-30 03:40:48'),(18,2,'approved reservation 11 for user 3.','2025-11-30 03:54:09'),(19,2,'Updated pool capacity settings to: S1=20, S2=20, S3=20, S4=20.','2025-12-01 02:43:08'),(20,2,'set max guests limit to 3 guests for Test Test (ID: 1).','2025-12-01 02:52:12'),(21,2,'created swimming lesson for 2025-12-01 (14:00-15:00) with 12 participants.','2025-12-01 03:31:41'),(22,2,'Blocked time from 2025-12-02 10:00:00 to 2025-12-02 12:00:00. Reason: Pool Maintenance','2025-12-01 10:28:00'),(23,2,'approved reservation 14 for user 1.','2025-12-01 10:29:19'),(24,2,'approved reservation 15 for user 4.','2025-12-01 10:30:31');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blocked_dates`
--

DROP TABLE IF EXISTS `blocked_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_dates` (
  `blocked_id` int NOT NULL AUTO_INCREMENT,
  `blocked_start_time` datetime NOT NULL,
  `blocked_end_time` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `admin_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`blocked_id`),
  KEY `admin_user_id` (`admin_user_id`),
  CONSTRAINT `blocked_dates_ibfk_1` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocked_dates`
--

LOCK TABLES `blocked_dates` WRITE;
/*!40000 ALTER TABLE `blocked_dates` DISABLE KEYS */;
INSERT INTO `blocked_dates` VALUES (1,'2025-12-02 10:00:00','2025-12-02 12:00:00','Pool Maintenance',2,'2025-12-01 10:28:00');
/*!40000 ALTER TABLE `blocked_dates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(100) NOT NULL DEFAULT 'other',
  `rating` int DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `feedback_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
INSERT INTO `feedback` VALUES (1,1,'staff_service',5,'Good Service!','2025-11-30 04:09:45');
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'Your reservation request for Nov 29, 2025, 8:00 AM has been submitted and is pending admin approval.',1,'2025-11-28 14:27:08'),(2,1,'Your reservation for Nov 29, 2025, 8:00 AM has been approved. We look forward to seeing you!',1,'2025-11-28 14:27:52'),(3,1,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 02:46:23'),(4,1,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 02:46:38'),(5,1,'Your reservation for Nov 30, 2025, 1:00 PM has been cancelled.',1,'2025-11-30 03:04:24'),(6,1,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 03:04:33'),(7,1,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 03:04:54'),(8,1,'Your reservation for Nov 30, 2025, 1:00 PM has been cancelled by the administrator. Reason: emergency pool maintenance...',1,'2025-11-30 03:15:03'),(9,1,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 03:18:46'),(10,1,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 03:19:03'),(11,1,'Your reservation for Nov 30, 2025, 1:00 PM has been cancelled by the administrator. Reason: pool maintenance...',1,'2025-11-30 03:22:09'),(12,3,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 03:22:41'),(13,3,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 03:22:55'),(14,3,'Your reservation for Nov 30, 2025, 1:00 PM has been cancelled by the administrator. Reason: pool maintenance...',1,'2025-11-30 03:23:20'),(15,3,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 03:29:48'),(16,3,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 03:31:42'),(17,3,'Your reservation for Nov 30, 2025, 1:00 PM has been cancelled by the administrator. Reason: pool maintenance...',1,'2025-11-30 03:40:48'),(18,3,'Your reservation request for Nov 30, 2025, 1:00 PM has been submitted and is pending admin approval.',1,'2025-11-30 03:53:30'),(19,3,'Your reservation for Nov 30, 2025, 1:00 PM has been approved. We look forward to seeing you!',1,'2025-11-30 03:54:09'),(20,1,'Your reservation request for Dec 1, 2025, 12:00 PM has been submitted and is pending admin approval.',1,'2025-12-01 02:56:31'),(21,1,'Your reservation request for Dec 1, 2025, 12:00 PM has been submitted and is pending admin approval.',1,'2025-12-01 02:56:35'),(22,1,'Your reservation for Dec 1, 2025, 12:00 PM has been cancelled.',1,'2025-12-01 03:02:10'),(23,1,'Your reservation request for Dec 1, 2025, 8:00 PM has been submitted and is pending admin approval.',1,'2025-12-01 10:29:04'),(24,1,'Your reservation for Dec 1, 2025, 8:00 PM has been approved. We look forward to seeing you!',1,'2025-12-01 10:29:19'),(25,1,'Your reservation for Dec 1, 2025, 8:00 PM has been cancelled.',1,'2025-12-01 10:29:43'),(26,4,'Your reservation request for Dec 1, 2025, 8:00 PM has been submitted and is pending admin approval.',0,'2025-12-01 10:30:20'),(27,4,'Your reservation for Dec 1, 2025, 8:00 PM has been approved. We look forward to seeing you!',0,'2025-12-01 10:30:31');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pool_settings`
--

DROP TABLE IF EXISTS `pool_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pool_settings` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `max_people_slot_1` int NOT NULL DEFAULT '20',
  `max_people_slot_2` int NOT NULL DEFAULT '20',
  `max_people_slot_3` int NOT NULL DEFAULT '20',
  `max_people_slot_4` int NOT NULL DEFAULT '20',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pool_settings`
--

LOCK TABLES `pool_settings` WRITE;
/*!40000 ALTER TABLE `pool_settings` DISABLE KEYS */;
INSERT INTO `pool_settings` VALUES (1,20,20,20,20,'2025-12-01 02:43:08');
/*!40000 ALTER TABLE `pool_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `reservation_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `guests` int DEFAULT '1',
  PRIMARY KEY (`reservation_id`),
  KEY `user_id` (`user_id`),
  KEY `time_lookup` (`start_time`,`end_time`,`status`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (1,1,'2025-11-16 08:00:00','2025-11-16 09:00:00','approved','2025-11-15 15:11:40',1),(2,3,'2025-11-16 09:00:00','2025-11-16 10:00:00','approved','2025-11-15 15:43:10',1),(3,3,'2025-11-16 11:00:00','2025-11-16 12:00:00','pending','2025-11-15 15:56:24',1),(4,3,'2025-11-16 10:00:00','2025-11-16 11:00:00','pending','2025-11-15 16:10:57',1),(5,1,'2025-11-29 08:00:00','2025-11-29 09:00:00','approved','2025-11-28 14:27:07',1),(6,1,'2025-11-30 13:00:00','2025-11-30 14:00:00','cancelled','2025-11-30 02:46:23',1),(7,1,'2025-11-30 13:00:00','2025-11-30 14:00:00','cancelled','2025-11-30 03:04:33',5),(8,1,'2025-11-30 13:00:00','2025-11-30 14:00:00','cancelled','2025-11-30 03:18:46',5),(9,3,'2025-11-30 13:00:00','2025-11-30 14:00:00','cancelled','2025-11-30 03:22:41',5),(10,3,'2025-11-30 13:00:00','2025-11-30 14:00:00','cancelled','2025-11-30 03:29:48',5),(11,3,'2025-11-30 13:00:00','2025-11-30 14:00:00','approved','2025-11-30 03:53:30',5),(12,1,'2025-12-01 12:00:00','2025-12-01 13:00:00','pending','2025-12-01 02:56:31',3),(13,1,'2025-12-01 12:00:00','2025-12-01 13:00:00','cancelled','2025-12-01 02:56:35',3),(14,1,'2025-12-01 20:00:00','2025-12-01 21:00:00','cancelled','2025-12-01 10:29:04',1),(15,4,'2025-12-01 20:00:00','2025-12-01 21:00:00','approved','2025-12-01 10:30:20',1);
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `swimming_lessons`
--

DROP TABLE IF EXISTS `swimming_lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `swimming_lessons` (
  `lesson_id` int NOT NULL AUTO_INCREMENT,
  `lesson_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `participants` int NOT NULL DEFAULT '1',
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lesson_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `swimming_lessons_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `swimming_lessons`
--

LOCK TABLES `swimming_lessons` WRITE;
/*!40000 ALTER TABLE `swimming_lessons` DISABLE KEYS */;
INSERT INTO `swimming_lessons` VALUES (1,'2025-12-01','14:00:00','15:00:00',12,'Beginner Class',2,'2025-12-01 03:31:41');
/*!40000 ALTER TABLE `swimming_lessons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `fName` varchar(50) NOT NULL,
  `lName` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('renter','admin') NOT NULL,
  `Is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `max_guests` int DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test','Test','test@gmail.com','$2b$10$syZV56ZjP2QnAGWy5R2U4uj7AVxy/iICgDue.kIKp8AKb67F3MkZS','renter',1,'2025-11-15 14:46:50',NULL,NULL,3),(2,'Admin','User','linacj162@gmail.com','$2b$10$JltTpWtnWrRzUbs/YSFPYOxBmtdGYpd4AYy95liDtWiDxtpj/8zRG','admin',1,'2025-11-15 14:55:00',NULL,NULL,NULL),(3,'test','test','123demonking@gmail.com','$2b$10$BsRto.gys5QyBCKPj8nfsurc/WoTfHeXuEnSAtndSsla4I7cEAMIS','renter',1,'2025-11-15 15:42:36',NULL,NULL,NULL),(4,'Test','test','test2@gmail.com','$2b$10$5i5axIo0Q8/HTG/cs9Mkzewzsgmkq51w8qa2XuJT5fhQ4zKkQsl/6','renter',1,'2025-11-28 10:12:42',NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-01 19:37:47
