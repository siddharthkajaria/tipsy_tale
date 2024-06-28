class AddFieldToGame < ActiveRecord::Migration[7.0]
  def change
    add_column :games, :game_desc, :text
    add_column :games, :image, :text
  end
end
