class RenameGameDescToGameRule < ActiveRecord::Migration[7.0]
  def change
    rename_column :game_instructions, :game_desc, :game_rule
  end
end
