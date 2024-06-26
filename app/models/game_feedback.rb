# == Schema Information
#
# Table name: game_feedbacks
#
#  id         :bigint           not null, primary key
#  feedback   :text(65535)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  game_id    :bigint           not null
#
# Indexes
#
#  index_game_feedbacks_on_game_id  (game_id)
#
# Foreign Keys
#
#  fk_rails_...  (game_id => games.id)
#
class GameFeedback < ApplicationRecord
  belongs_to :game
end
