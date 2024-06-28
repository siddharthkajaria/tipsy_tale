
class GameInstructionsController < ApplicationController
  before_action :set_game, only: %i[ show ]


  def show
    @rule = @game.game_instructions.first
  end

  private

  def set_game
    @game = Game.friendly.find(params[:slug])
  end

end
