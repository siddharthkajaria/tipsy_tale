class AddImageUrlToGameAnswers < ActiveRecord::Migration[7.0]
  def change
    add_column :game_answers, :image_url, :string
  end
end
