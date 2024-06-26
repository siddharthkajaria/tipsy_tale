# == Schema Information
#
# Table name: game_instructions
#
#  id         :bigint           not null, primary key
#  game_desc  :text(65535)
#  status     :boolean
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  game_id    :bigint           not null
#
# Indexes
#
#  index_game_instructions_on_game_id  (game_id)
#
# Foreign Keys
#
#  fk_rails_...  (game_id => games.id)
#
class GameInstruction < ApplicationRecord
  belongs_to :game
end
