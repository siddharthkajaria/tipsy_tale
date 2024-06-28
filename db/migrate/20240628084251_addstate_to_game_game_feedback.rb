class AddstateToGameGameFeedback < ActiveRecord::Migration[7.0]
  def change
    add_column :game_feedbacks, :state, :string
  end
end
