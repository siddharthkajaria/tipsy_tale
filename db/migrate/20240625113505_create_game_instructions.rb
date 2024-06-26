class CreateGameInstructions < ActiveRecord::Migration[7.0]
  def change
    create_table :game_instructions do |t|
      t.references :game, null: false, foreign_key: true
      t.text :game_desc
      t.boolean :status

      t.timestamps
    end
  end
end
