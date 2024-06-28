# == Schema Information
#
# Table name: game_answers
#
#  id          :bigint           not null, primary key
#  answer_type :string(255)
#  card_code   :integer
#  text_answer :text(65535)
#  video_link  :text(65535)
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
  has_one_attached :image_answer #active storage

  belongs_to :game
end
