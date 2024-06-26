class CreateGameFeedbacks < ActiveRecord::Migration[7.0]
  def change
    create_table :game_feedbacks do |t|
      t.references :game, null: false, foreign_key: true
      t.text :feedback

      t.timestamps
    end
  end
end
