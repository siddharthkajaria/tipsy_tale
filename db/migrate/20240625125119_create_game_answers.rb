class CreateGameAnswers < ActiveRecord::Migration[7.0]
  def change
    create_table :game_answers do |t|
      t.references :game, null: false, foreign_key: true
      t.integer :card_code
      t.string :answer_type
      t.text :text_answer
      t.text :img_answer

      t.timestamps
    end
  end
end
