
class GameAnswersController < ApplicationController
  before_action :set_game, only: %i[show card_code]
  # before_action :set_game_answer, only: %i[show]


  def show
    
    # binding.irb
    @game_answer = @game.game_answers.where(card_code:params[:code]).last
    render json: {
      id: @game_answer.id,
      answer_type: @game_answer.answer_type,
      text_answer: @game_answer.text_answer,
      video_link: @game_answer.video_link,
      image_answer: @game_answer.image_answer.attached? ? url_for(@game_answer.image_answer) : nil
    }
    # render json: @game_answer.to_json
  end

  def card_code
    
  end

  private

  def set_game
    @game = Game.friendly.find(params[:slug])
  end

end
