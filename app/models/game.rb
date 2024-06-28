# == Schema Information
#
# Table name: games
#
#  id         :bigint           not null, primary key
#  code       :string(255)
#  game_desc  :text(65535)
#  name       :string(255)
#  slug       :string(255)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_games_on_slug  (slug) UNIQUE
#
class Game < ApplicationRecord
    extend FriendlyId
    friendly_id :slug, use: :slugged

    has_one_attached :image

    has_many :game_feedbacks
    has_many :game_instructions
    has_many :game_answers

    before_save :generate_slug

    def self.ransackable_attributes(auth_object = nil)
        %w[name]
    end

    # If code is changed, the friendly_id (slug) will be regenerated
    def should_generate_new_friendly_id?
        name_changed?
    end

    private

    def generate_slug
        self.slug = name.parameterize if name_changed?
    end
end
