<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * ForEx implementation : © <David Edelstein> <david.edelstein@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * forex.action.php
 *
 * ForEx main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/forex/forex/myAction.html", ...)
 *
 */
  
  
  class action_forex extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "forex_forex";
            self::trace( "Complete reinitialization of board game" );
      }
  	} 
  	
  	// TODO: defines your action entry points there
    /**
     * Either lead or follow
     */
    public function offerSpotTrade() {
      self::setAjaxMode();     
      $player_id = self::getArg( "to_player", AT_posint, true );
      $offer = self::getArg( "off_curr", AT_alphanum, true );
      $request = self::getArg( "req_curr", AT_alphanum, true );

      $this->game->offerSpotTrade( $player_id, $offer, $request );
      self::ajaxResponse( );
    }

  }
  

