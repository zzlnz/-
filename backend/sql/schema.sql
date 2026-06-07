CREATE DATABASE IF NOT EXISTS house_rental DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE house_rental;

SOURCE ./tables/user.sql;
SOURCE ./tables/house.sql;
SOURCE ./tables/rental_application.sql;
SOURCE ./tables/lease_record.sql;
