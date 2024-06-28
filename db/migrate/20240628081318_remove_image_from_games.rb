class RemoveImageFromGames < ActiveRecord::Migration[7.0]
  def change
    remove_column :games, :image, :text
  end
end
