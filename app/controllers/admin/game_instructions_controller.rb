# frozen_string_literal: true

class Admin::GameInstructionsController < Admin::BaseController
  before_action :set_admin
  before_action :set_game, only: %i[ create ]
  before_action :set_game_instruction, only: %i[create]


  def create
    if @game_instruction.present?
      @game_instruction.destroy
      @game_instruction = GameInstruction.create!(game_id:params[:id], game_rule:params[:content], status: true)
    else
      @game_instruction = GameInstruction.create!(game_id:params[:id], game_rule:params[:content], status: true)
    end
  end

  private

  def set_admin
    @admin = current_admin
  end

  def set_game
    @game = Game.find(params[:id])
  end

  def set_game_instruction
    @game_instruction = @game.game_instructions.where(:status=>true).first
  end

  def game_instruction_params
    params.require(:game_instruction).permit(:game_rule)
  end
end
