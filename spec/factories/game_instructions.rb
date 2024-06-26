FactoryBot.define do
  factory :game_instruction do
    game { nil }
    game_desc { "MyText" }
    status { false }
  end
end
