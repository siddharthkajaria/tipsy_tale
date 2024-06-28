# == Schema Information
#
# Table name: game_feedbacks
#
#  id           :bigint           not null, primary key
#  email        :string(255)      not null
#  feedback     :text(65535)
#  phone_number :integer
#  state        :string(255)
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  game_id      :bigint           not null
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

  state_machine :state , :initial => :open do

    state :open , :value => "Open"   #Poll just got created 
    state :inprogress , :value=> "Inprogress" #when click on live this poll
    state :closed , :value=> "Closed" #when time passed (cron)

    event :inprogress do 
        transition [:open ] => :inprogress
    end

    event :closed do 
        transition [:inprogress] => :closed
    end

end

  def self.ransackable_attributes(auth_object = nil)
    %w[state]
  end

  def update_status state
    if state == "inprogress"
      self.inprogress
    elsif state == "closed"
      self.closed
    end
  end
end
