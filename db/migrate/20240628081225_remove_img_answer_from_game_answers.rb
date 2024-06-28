class RemoveImgAnswerFromGameAnswers < ActiveRecord::Migration[7.0]
  def change
    remove_column :game_answers, :img_answer, :text
  end
end
