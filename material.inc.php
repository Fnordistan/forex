<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * material.inc.php
 *
 * For-Ex game material description
 */

$this->contracts = ['A','B','C','D','E','F'];

$this->currency_enum = array('GBP' => 1, 'EUR' => 2, 'USD' => 3, 'CHF' => 4, 'JPY' => 5, 'CAD' => 6, 'CNY' => 7);

/**
 * Number of bucks paid according to how many dividends are left
 */
$this->dividends = array(
    5 => 0,
    4 => 2,
    3 => 2,
    2 => 2,
    1 => 3
);

$this->currencies = array(
  1 => 'GBP',
  2 => 'EUR',
  3 => 'USD',
  4 => 'CHF',
  5 => 'JPY',
  6 => 'CAD',
  7 => 'CNY'
);

// mapping of position on exchange track to value
$this->exchange = array(
  1 => 1,
  2 => 1.5,
  3 => 2,
  4 => 2.5,
  5 => 3,
  6 => 3.5,
  7 => 4,
  8 => 5,
  9 => 6,
  10 => 8
);