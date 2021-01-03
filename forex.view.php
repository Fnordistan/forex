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
        $contracts = array('A', 'B', 'C', 'D', 'E', 'F');

        $this->page->begin_block($template, 'CONTRACTS_BLOCK');
        foreach ( $contracts as $contract) {
          $this->page->insert_block('CONTRACTS_BLOCK', array(
            'CONTRACT' => $contract
          ));
        }

        /*********** Do not change anything below this line  ************/
  	}
  }
  

