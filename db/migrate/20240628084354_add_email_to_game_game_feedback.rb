class AddEmailToGameGameFeedback < ActiveRecord::Migration[7.0]
  def change
    add_column :game_feedbacks, :email, :string, null: false
    add_column :game_feedbacks, :phone_number, :integer
  end
end
