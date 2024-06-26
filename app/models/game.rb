# == Schema Information
#
# Table name: games
#
#  id         :bigint           not null, primary key
#  code       :string(255)
#  name       :string(255)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class Game < ApplicationRecord
    has_many :game_feedbacks
    has_many :game_instructions
    has_many :game_answers

    def self.ransackable_attributes(auth_object = nil)
        %w[name]
    end
end
