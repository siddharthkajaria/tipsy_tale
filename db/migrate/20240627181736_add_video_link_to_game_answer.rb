class AddVideoLinkToGameAnswer < ActiveRecord::Migration[7.0]
  def change
    add_column :game_answers, :video_link, :text
  end
end
