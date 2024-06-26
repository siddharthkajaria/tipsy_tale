# == Schema Information
#
# Table name: game_answers
#
#  id          :bigint           not null, primary key
#  answer_type :string(255)
#  card_code   :integer
#  img_answer  :text(65535)
#  text_answer :text(65535)
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  game_id     :bigint           not null
#
# Indexes
#
#  index_game_answers_on_game_id  (game_id)
#
# Foreign Keys
#
#  fk_rails_...  (game_id => games.id)
#
class GameAnswer < ApplicationRecord
  belongs_to :game
end
