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
    
    /**
     * Player offers a Spot Trade
     */
    public function offerSpotTrade() {
      self::setAjaxMode();     
      $to_player = self::getArg( "to_player", AT_posint, true );
      $offer = self::getArg( "off_curr", AT_alphanum, true );
      $request = self::getArg( "req_curr", AT_alphanum, true );

      $this->game->offerSpotTrade( $to_player, $offer, $request );
      self::ajaxResponse();
    }

    /**
     * Original offerer canceled offer.
     */
    public function cancelSpotTrade() {
      self::setAjaxMode();
      $this->game->cancelSpotTrade();
      self::ajaxResponse();
    }

    /**
     * Player responds to a Spot Trade
     */
    public function respondSpotTrade() {
      self::setAjaxMode();     
      $accept = self::getArg( "accept", AT_bool, true );

      $this->game->respondSpotTrade( $accept );
      self::ajaxResponse();
    }

    /**
     * Buy certificates one at a time
     */
    public function investCurrency() {
      self::setAjaxMode();
      $curr_to_buy = self::getArg( "buys", AT_alphanum, true );
      $this->game->investCurrency( $curr_to_buy );
      self::ajaxResponse();
    }

    /**
     * Sell certificates.
     */
     public function divestCurrency() {
      self::setAjaxMode();
      $curr = self::getArg( "curr", AT_alphanum, true );
      $num = self::getArg( "amt", AT_posint, true );
      $this->game->divestCurrency( $curr, $num );
      self::ajaxResponse();
    }

    /**
     * Additional players sell (or sell 0)
     */
    public function optDivestCurrency() {
      self::setAjaxMode();
      $curr = self::getArg( "curr", AT_alphanum, true );
      $num = self::getArg( "amt", AT_posint, true );
      $this->game->optDivestCurrency( $curr, $num );
      self::ajaxResponse();
    }

    /**
     * Create contract.
     */
    public function makeContract() {
      self::setAjaxMode();
      $prom_curr = self::getArg( "promise", AT_alphanum, true );
      $pay_curr = self::getArg( "payout", AT_alphanum, true );
      $prom_amt = self::getArg( "promise_amt", AT_float, true );
      $pay_amt = self::getArg( "payout_amt", AT_float, true );
      $this->game->makeContract($prom_curr, $prom_amt, $pay_curr, $pay_amt);
      self::ajaxResponse();
    }

    /**
     * Resolve contract.
     */
    public function resolveContract() {
      self::setAjaxMode();
      $this->game->resolveContract();
      self::ajaxResponse();
    }

    /**
     * Strengthen the chosen currency.
     */
    public function chooseCurrencyToStrengthen() {
      self::setAjaxMode();
      $curr = self::getArg("curr", AT_alphanum, true);
      $this->game->chooseCurrencyToStrengthen($curr);
      self::ajaxResponse();
    }
}