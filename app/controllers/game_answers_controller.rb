
class GameAnswersController < ApplicationController
  before_action :set_game, only: %i[show]
  before_action :set_game_answer, only: %i[show]


  def show
    
  end

  def card_code
    
  end

  private

  def set_game_answer
    @game_answer = GameAnswer.find(params[:id])
  end

  def set_game
    @game = Game.find(params[:id])
  end

end
