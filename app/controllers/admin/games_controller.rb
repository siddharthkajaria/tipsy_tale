# frozen_string_literal: true

class Admin::GamesController < Admin::BaseController
  before_action :set_admin
  before_action :set_game, only: %i[show edit update destroy]


  def index
        
    @search = Game.all.ransack(params[:q])
    @games = Game.all
    respond_to do |format|
      format.html { @pagy, @games = pagy(@search.result) }
      format.csv  { render csv: @search.result }
    end
  end

  def show
    @game_feedbacks = @game.game_feedbacks.order(created_at: :desc)
    @game_instruction = @game.game_instructions.where(:status=>true).first
    @game_answers = @game.game_answers

  end

  def new
    @game = Game.new
  end

  def edit; end

  def create
    @game = Game.new(game_params)
    @game.code = game_params[:name].parameterize.underscore
    if @game.save
      redirect_to admin_games_path, notice: 'Game was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
        
    @game.code = game_params[:name].parameterize.underscore
    if @game.update(game_params)
      redirect_to admin_games_path, notice: 'Game was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @game.destroy
    redirect_to admin_games_url, status: :see_other, notice: 'Game was successfully destroyed.'
  end

  private

  def set_admin
    @admin = current_admin
  end

  def set_game
        
    if params[:slug].present?
      @game = Game.friendly.find_by(slug: params[:slug])
    else
      @game = Game.find(params[:id])
    end
    
    # @game = Game.friendly.find_by(slug: params[:slug]) || Game.find(params[:id])
  end

  def game_params
    params.require(:game).permit(:name, :game_desc, :image, :slug)
  end
end
