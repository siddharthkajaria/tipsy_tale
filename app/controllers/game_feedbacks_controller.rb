class GameFeedbacksController < ApplicationController

  before_action :set_game, only: %i[ show new create ]

  def index; end
  def show; end

  def new
    @game_feedback = GameFeedback.new
  end

  def create
    @game_feedback = @game.game_feedbacks.new(game_feedback_params)
    if @game_feedback.save
      render json: { message: 'Feedback submitted successfully.' }, status: :created
    else
      render json: { errors: @game_feedback.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private


  def set_game
    @game = Game.friendly.find(params[:slug])
  end

  def game_feedback_params
    params.require(:game_feedback).permit(:feedback, :email, :phone_number)
  end

end
