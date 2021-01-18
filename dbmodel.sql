
-- ------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

CREATE TABLE IF NOT EXISTS `CERTIFICATES` ( 
  `card_id` TINYINT unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(3) NOT NULL COMMENT 'currency',
  `card_type_arg` TINYINT NULL COMMENT 'not used',
  `card_location` varchar(16) NOT NULL COMMENT 'player_id|available|discard',
  `card_location_arg` TINYINT NULL COMMENT 'not used',
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `CONTRACTS` (
    `contract` varchar(8) NOT NULL COMMENT 'A-F, Div',
    `owner` varchar(16) COMMENT 'player_id or null',
    `promise` varchar(3) COMMENT 'currency',
    `promise_amt` FLOAT(2),
    `payout` varchar(3) COMMENT 'currency',
    `payout_amt` FLOAT(2),
    `location` TINYINT COMMENT 'queue position or NULL',
    PRIMARY KEY (`contract`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `BANK` (
    `player` INT(11) NOT NULL,
    `curr` varchar(3) NOT NULL,
    `amt` FLOAT(2) NOT NULL,
    CONSTRAINT `Curr_Holdings` PRIMARY KEY (`player`, `curr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `CURRENCY_PAIRS` (
    `curr1` varchar(3) NOT NULL,
    `curr2` varchar(3) NOT NULL,
    `stronger` varchar(3) NOT NULL,
    `position` TINYINT NOT NULL COMMENT '1-10',
    CONSTRAINT `Curr_Pair` PRIMARY KEY (`curr1`,`curr2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

 ALTER TABLE `player` ADD `player_first` BOOLEAN NOT NULL DEFAULT '0';