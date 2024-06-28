class GamesController < ApplicationController

  before_action :set_game, only: %i[ show ]

  def index; end
  def show; end

  private

  def set_game
    @game = Game.friendly.find_by(slug: params[:slug]) || Game.find(params[:id])
  end

end
