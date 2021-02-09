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
 * forex.view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in forex_forex.tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */
  
require_once( APP_BASE_PATH."view/common/game.view.php" );

// values for curr_pr_zones, if we need to resize later
define('ZONE_X', 90);
define('ZONE_Y', 85);
define('ZONE_H_GAP', 42);
define('ZONE_V_GAP', 107);

  class view_forex_forex extends game_view
  {
    function getGameName() {
        return "forex";
    }    
  	function build_page( $viewArgs )
  	{		
  	    // Get players & players number
        $players = $this->game->loadPlayersBasicInfos();
        $players_nbr = count( $players );

        /*********** Place your code below:  ************/

        $template = self::getGameName() . "_" . self::getGameName();

        // this will make labels text translatable
        $this->tpl['CONTRACT_DISPLAY'] = self::_("Contract Display");
        $this->tpl['CERTS_AVAILABLE'] = self::_("Available Certificates");
        $this->tpl['CONTRACT_QUEUE'] = self::_("Contract Queue");

        $this->page->begin_block($template, 'CURRENCY_PAIRS_BLOCK');
        $y = ZONE_Y;
        foreach( $this->game->currencies as $c => $curr ) {
          $x = ZONE_X;
          for ($i = 1; $i <= 10; $i++ ) {
            $this->page->insert_block('CURRENCY_PAIRS_BLOCK', array(
                'CURR' => $curr,
                'ZONE' => $i,
                'L' => $x,
                'T' => $y
            ));
            $x += ZONE_H_GAP;
          }
          $y += ZONE_V_GAP;
        }
        $this->page->begin_block($template, 'CERTIFICATES_BLOCK');
        foreach( $this->game->currencies as $c => $curr ) {
          $this->page->insert_block('CERTIFICATES_BLOCK', array(
              'CURR' => $curr
          ));
        }

        $this->page->begin_block($template, 'CONTRACTS_BLOCK');
        foreach ( $this->game->contracts as $contract ) {
          $this->page->insert_block('CONTRACTS_BLOCK', array(
            'CONTRACT' => $contract
          ));
        }

        $this->page->begin_block($template, 'QUEUE_BLOCK');
        for ($i = 7; $i > 0; $i--) {
          $this->page->insert_block('QUEUE_BLOCK', array(
            'Q' => $i
          ));
        }

        $this->page->begin_block($template, 'BANK_BLOCK');
        foreach( $this->game->currencies as $c => $curr ) {
          $this->page->insert_block('BANK_BLOCK', array(
            'CURR' => $curr
          ));
        }
        /*********** Do not change anything below this line  ************/
  	}
  }
  

